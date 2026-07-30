"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LoopDiagram from "@/components/autopilot/LoopDiagram";
import AutopilotFeedPanel from "@/components/autopilot/AutopilotFeedPanel";
import RequestCard from "@/components/autopilot/RequestCard";
import StatsBar from "@/components/autopilot/StatsBar";
import BuildPreviewModal from "@/components/autopilot/BuildPreviewModal";
import {
  fetchBuild,
  fetchCustomerResponse,
  fetchEvaluation,
  fetchSponsorShareEmail,
} from "@/lib/autopilotApi";
import {
  makeFlywheelRequest,
  pickFlywheelTarget,
  seedInitialRequests,
} from "@/lib/autopilotSeed";
import { formatUSD } from "@/lib/format";
import type { PricingConfig } from "@/lib/pricing";
import {
  STATE_TO_NODE,
  type AddonRequest,
  type AutopilotActor,
  type AutopilotEvent,
  type AutopilotEventDetail,
  type DiagramNodeId,
} from "@/lib/autopilotTypes";
import type { Account } from "@/lib/types";

interface AutopilotTabProps {
  accounts: Account[];
  pricingConfig: PricingConfig;
}

const TICK_MS = 4000;
const MAX_FLYWHEEL_CYCLES = 3;
const FLYWHEEL_DELAY_MS = 20000;
const MAX_CONSECUTIVE_FAILURES = 2;

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AutopilotTab({ accounts, pricingConfig }: AutopilotTabProps) {
  const [requests, setRequests] = useState<AddonRequest[]>(() =>
    seedInitialRequests(accounts),
  );
  const [events, setEvents] = useState<AutopilotEvent[]>([]);
  const [autopilotOn, setAutopilotOn] = useState(false);
  const [guardrailPaused, setGuardrailPaused] = useState(false);
  const [flywheelSpawnCount, setFlywheelSpawnCount] = useState(0);
  const [preview, setPreview] = useState<{
    title: string;
    code: string;
    releaseNote: string;
  } | null>(null);

  const activeCallLock = useRef(false);
  const consecutiveFailures = useRef(0);
  const pendingTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const followupIndex = useRef(0);
  const requestsRef = useRef(requests);
  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  const findAccount = useCallback(
    (accountId: string) => accounts.find((a) => a.id === accountId),
    [accounts],
  );

  const pushEvent = useCallback(
    (
      actor: AutopilotActor,
      requestId: string,
      accountName: string,
      summary: string,
      detail: AutopilotEventDetail | null = null,
    ) => {
      setEvents((prev) => [
        ...prev,
        { id: generateId(), timestamp: Date.now(), actor, requestId, accountName, summary, detail },
      ]);
    },
    [],
  );

  const updateRequest = useCallback((id: string, patch: Partial<AddonRequest>) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  // --- Flywheel -----------------------------------------------------

  const triggerFlywheel = useCallback(
    (sharedRequest: AddonRequest) => {
      const originAccount = findAccount(sharedRequest.accountId);
      if (!originAccount) return;

      const target = pickFlywheelTarget(
        originAccount,
        accounts,
        requestsRef.current,
        followupIndex.current,
      );
      if (target) {
        pushEvent(
          "System",
          sharedRequest.id,
          target.account.accountName,
          `cross-sell match found for "${sharedRequest.title}" — outreach queued`,
        );
      }

      if (flywheelSpawnCount >= MAX_FLYWHEEL_CYCLES) {
        pushEvent(
          "System",
          sharedRequest.id,
          sharedRequest.accountName,
          `flywheel cap reached (${MAX_FLYWHEEL_CYCLES} cycles this session) — no new inbound request spawned`,
        );
        return;
      }

      if (!target) return;

      const timeout = setTimeout(() => {
        const newRequest = makeFlywheelRequest(target.template, target.account);
        setRequests((prev) => [...prev, newRequest]);
        followupIndex.current += 1;
        setFlywheelSpawnCount((n) => n + 1);
        pushEvent(
          "System",
          newRequest.id,
          newRequest.accountName,
          `new inbound request arrived: "${newRequest.title}"`,
        );
      }, FLYWHEEL_DELAY_MS);
      pendingTimeouts.current.push(timeout);
    },
    [accounts, findAccount, flywheelSpawnCount, pushEvent],
  );

  // --- Per-request step processing (shared by autopilot + manual) ----

  const processRequest = useCallback(
    async (request: AddonRequest) => {
      const account = findAccount(request.accountId);
      updateRequest(request.id, { processing: true, error: null });

      try {
        if (request.state === "RECEIVED") {
          const evaluation = await fetchEvaluation(request, pricingConfig, {
            accountType: account?.accountType ?? "",
            paymentStatus: account?.paymentStatus ?? "",
            npsScore: account?.npsScore ?? 0,
            notes: account?.notes ?? "",
          });
          updateRequest(request.id, {
            evaluation,
            state: "EVALUATED",
            processing: false,
          });
          pushEvent(
            "Decision Agent",
            request.id,
            request.accountName,
            `scored "${request.title}" at ${evaluation.score}/100`,
          );
          consecutiveFailures.current = 0;
          return;
        }

        if (request.state === "EVALUATED" && request.evaluation) {
          const { decision, offerEmail, quoteAmount } = request.evaluation;
          const nextState =
            decision === "reject"
              ? "REJECTED_REPLIED"
              : decision === "free"
                ? "FREE_OFFERED"
                : "QUOTED";
          updateRequest(request.id, {
            state: nextState,
            offerAmount: decision === "quote" ? quoteAmount : 0,
            processing: false,
          });
          const actor: AutopilotActor =
            decision === "reject" ? "Decision Agent" : "Quote Agent";
          const summary =
            decision === "reject"
              ? `sent a decline to "${request.title}"`
              : decision === "free"
                ? `offered "${request.title}" for free`
                : `sent a quote of ${formatUSD(quoteAmount)} for "${request.title}"`;
          pushEvent(actor, request.id, request.accountName, summary, {
            kind: "email",
            subject: offerEmail.subject,
            body: offerEmail.body,
          });
          consecutiveFailures.current = 0;
          return;
        }

        if (request.state === "QUOTED" || request.state === "FREE_OFFERED") {
          const isFinalRound = request.negotiationRound >= 1;
          const offerType = request.state === "QUOTED" ? "quote" : "free";
          const response = await fetchCustomerResponse(
            request,
            {
              paymentStatus: account?.paymentStatus ?? "",
              npsScore: account?.npsScore ?? 0,
              notes: account?.notes ?? "",
            },
            offerType,
            request.offerAmount,
            isFinalRound,
          );

          if (response.decision === "negotiate" && !isFinalRound) {
            const discounted =
              request.offerAmount > 0 ? Math.round(request.offerAmount * 0.9) : 0;
            updateRequest(request.id, {
              negotiationRound: 1,
              offerAmount: discounted,
              customerResponse: response,
              processing: false,
            });
            pushEvent(
              "Customer (simulated)",
              request.id,
              request.accountName,
              `asked for a discount on "${request.title}" — countering at ${formatUSD(discounted)}`,
              { kind: "email", subject: response.replyEmail.subject, body: response.replyEmail.body },
            );
            consecutiveFailures.current = 0;
            return;
          }

          const finalDecision = response.decision === "agree" ? "agree" : "decline";
          const nextState = finalDecision === "agree" ? "CUSTOMER_AGREED" : "CUSTOMER_DECLINED";
          updateRequest(request.id, {
            state: nextState,
            negotiationRound: 2,
            customerResponse: response,
            finalDecision,
            processing: false,
          });
          pushEvent(
            "Customer (simulated)",
            request.id,
            request.accountName,
            `${finalDecision === "agree" ? "agreed to" : "declined"} the offer for "${request.title}"`,
            { kind: "email", subject: response.replyEmail.subject, body: response.replyEmail.body },
          );
          consecutiveFailures.current = 0;
          return;
        }

        if (request.state === "CUSTOMER_AGREED") {
          updateRequest(request.id, { state: "BUILDING" });
          pushEvent(
            "Build Agent",
            request.id,
            request.accountName,
            `started building "${request.title}"`,
          );
          const build = await fetchBuild(request, account?.notes ?? "");
          updateRequest(request.id, { state: "BUILT", build, processing: false });
          pushEvent(
            "Build Agent",
            request.id,
            request.accountName,
            `shipped a live preview of "${request.title}"`,
            { kind: "build", releaseNote: build.releaseNote, code: build.code },
          );
          consecutiveFailures.current = 0;
          return;
        }

        updateRequest(request.id, { processing: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        updateRequest(request.id, { processing: false, error: message });
        consecutiveFailures.current += 1;
        pushEvent(
          "System",
          request.id,
          request.accountName,
          `step failed (${message})`,
        );
        if (consecutiveFailures.current >= MAX_CONSECUTIVE_FAILURES) {
          setGuardrailPaused(true);
          setAutopilotOn(false);
        }
      }
    },
    [findAccount, pricingConfig, pushEvent, updateRequest],
  );

  // --- Human gate: approve deploy ------------------------------------

  const approveDeploy = useCallback(
    async (id: string) => {
      const request = requestsRef.current.find((r) => r.id === id);
      if (!request || request.state !== "BUILT") return;

      updateRequest(id, { state: "IN_LIBRARY", processing: true, error: null });
      pushEvent(
        "Build Agent",
        request.id,
        request.accountName,
        `added "${request.title}" to the Add-On Library — live`,
      );

      try {
        const sponsorEmail = await fetchSponsorShareEmail(request, pricingConfig);
        const sharedAt = Date.now();
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, state: "SHARED_WITH_SPONSOR", sponsorEmail, sharedAt, processing: false }
              : r,
          ),
        );
        pushEvent(
          "Build Agent",
          request.id,
          request.accountName,
          `shared "${request.title}" with the sponsor — revenue share activated`,
          { kind: "email", subject: sponsorEmail.subject, body: sponsorEmail.body },
        );
        triggerFlywheel({ ...request, state: "SHARED_WITH_SPONSOR", sharedAt });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        updateRequest(id, { processing: false, error: message });
        pushEvent("System", request.id, request.accountName, `sponsor share failed (${message})`);
      }
    },
    [pricingConfig, pushEvent, triggerFlywheel, updateRequest],
  );

  // --- Orchestrator loop ----------------------------------------------

  const getReadyRequest = useCallback((): AddonRequest | null => {
    const actionable = requestsRef.current.filter(
      (r) =>
        !r.processing &&
        (r.state === "RECEIVED" ||
          r.state === "EVALUATED" ||
          r.state === "QUOTED" ||
          r.state === "FREE_OFFERED" ||
          r.state === "CUSTOMER_AGREED"),
    );
    return actionable[0] ?? null;
  }, []);

  useEffect(() => {
    if (!autopilotOn || guardrailPaused) return;
    const interval = setInterval(() => {
      if (activeCallLock.current) return;
      const next = getReadyRequest();
      if (!next) return;
      activeCallLock.current = true;
      processRequest(next).finally(() => {
        activeCallLock.current = false;
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [autopilotOn, guardrailPaused, getReadyRequest, processRequest]);

  useEffect(() => {
    return () => {
      pendingTimeouts.current.forEach(clearTimeout);
    };
  }, []);

  // --- Manual fallback --------------------------------------------------

  const manualAdvance = useCallback(
    (id: string) => {
      if (activeCallLock.current) return;
      const request = requestsRef.current.find((r) => r.id === id);
      if (!request) return;
      activeCallLock.current = true;
      processRequest(request).finally(() => {
        activeCallLock.current = false;
      });
    },
    [processRequest],
  );

  // --- Reset ------------------------------------------------------------

  const resetDemo = useCallback(() => {
    pendingTimeouts.current.forEach(clearTimeout);
    pendingTimeouts.current = [];
    activeCallLock.current = false;
    consecutiveFailures.current = 0;
    followupIndex.current = 0;
    setAutopilotOn(false);
    setGuardrailPaused(false);
    setFlywheelSpawnCount(0);
    setEvents([]);
    setRequests(seedInitialRequests(accounts));
  }, [accounts]);

  // --- Derived: diagram counts, stats -----------------------------------

  const nodeCounts = useMemo(() => {
    const counts: Record<DiagramNodeId, number> = {
      received: 0,
      evaluated: 0,
      offered: 0,
      responded: 0,
      building: 0,
      built: 0,
      in_library: 0,
      shared: 0,
    };
    for (const r of requests) {
      counts[STATE_TO_NODE[r.state]] += 1;
    }
    return counts;
  }, [requests]);

  const activeNodeId = useMemo<DiagramNodeId | null>(() => {
    const processingRequest = requests.find((r) => r.processing);
    return processingRequest ? STATE_TO_NODE[processingRequest.state] : null;
  }, [requests]);

  const stats = useMemo(() => {
    const shared = requests.filter((r) => r.state === "SHARED_WITH_SPONSOR");
    return {
      cyclesCompleted: shared.length,
      addonsShipped: shared.length,
      newARRCaptured: shared.reduce((sum, r) => sum + r.projectedAnnualSKURevenue, 0),
      cycleTimesMs: shared
        .filter((r) => r.sharedAt !== null)
        .map((r) => (r.sharedAt as number) - r.createdAt),
    };
  }, [requests]);

  const sortedRequests = useMemo(() => {
    const priority: Record<AddonRequest["state"], number> = {
      BUILDING: 0,
      BUILT: 1,
      CUSTOMER_AGREED: 2,
      QUOTED: 3,
      FREE_OFFERED: 3,
      EVALUATED: 4,
      RECEIVED: 5,
      IN_LIBRARY: 6,
      SHARED_WITH_SPONSOR: 7,
      CUSTOMER_DECLINED: 8,
      REJECTED_REPLIED: 8,
    };
    return [...requests].sort((a, b) => priority[a.state] - priority[b.state]);
  }, [requests]);

  const handleViewBuild = useCallback(
    (id: string) => {
      const request = requests.find((r) => r.id === id);
      if (!request?.build) return;
      setPreview({
        title: request.title,
        code: request.build.code,
        releaseNote: request.build.releaseNote,
      });
    },
    [requests],
  );

  if (accounts.length === 0) return null;

  const flywheelCapReached = flywheelSpawnCount >= MAX_FLYWHEEL_CYCLES;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Autopilot</h2>
          <p className="max-w-lg text-sm text-slate-500">
            Autonomous orchestration over the Add-On Marketplace — evaluates
            requests, quotes or offers them free, simulates the customer,
            builds a live preview, and (once you approve) ships it and feeds
            the flywheel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetDemo}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Reset demo
          </button>
          <button
            onClick={() => {
              setGuardrailPaused(false);
              consecutiveFailures.current = 0;
              setAutopilotOn((v) => !v);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm ${
              autopilotOn
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-indigo text-white hover:bg-indigo/90"
            }`}
          >
            ▶ Autopilot {autopilotOn ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {guardrailPaused && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            Autopilot paused — 2 consecutive step failures. Fix connectivity
            or try again.
          </span>
          <button
            onClick={() => {
              setGuardrailPaused(false);
              consecutiveFailures.current = 0;
              setAutopilotOn(true);
            }}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Resume
          </button>
        </div>
      )}

      {flywheelCapReached && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Flywheel cap reached — {MAX_FLYWHEEL_CYCLES} new inbound requests
          spawned this session. Existing requests keep processing normally.
        </div>
      )}

      <LoopDiagram counts={nodeCounts} activeNodeId={activeNodeId} />

      <StatsBar stats={stats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-2.5">
          {sortedRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              autopilotOn={autopilotOn}
              onManualAdvance={manualAdvance}
              onApproveDeploy={approveDeploy}
              onViewBuild={handleViewBuild}
            />
          ))}
        </div>
        <AutopilotFeedPanel events={events} isRunning={autopilotOn && !guardrailPaused} />
      </div>

      {preview && (
        <BuildPreviewModal
          title={preview.title}
          code={preview.code}
          releaseNote={preview.releaseNote}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
