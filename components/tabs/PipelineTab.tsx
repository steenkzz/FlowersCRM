"use client";

import { useEffect, useMemo, useState } from "react";
import PipelineFunnel from "@/components/PipelineFunnel";
import type { PipelineCardData } from "@/components/pipeline/PipelineCard";
import {
  computeEcommValue,
  computeInnovationValue,
  seedStage,
  selectEcommCandidates,
  selectInnovationCandidates,
} from "@/lib/pipeline";
import { fetchEcommScan } from "@/lib/ecommScan";
import { fetchInvite } from "@/lib/invite";
import { fetchMeetingPrep } from "@/lib/meetingPrep";
import { pipelineCallLimiter } from "@/lib/concurrencyQueue";
import type { PricingConfig } from "@/lib/pricing";
import {
  PIPELINE_STAGES,
  type Account,
  type CacheEntry,
  type DraftEmail,
  type EcommScanCache,
  type EcommScanResult,
  type InviteCache,
  type MeetingPrepCache,
  type PipelineKind,
  type StageId,
  type StageMap,
} from "@/lib/types";

interface PipelineTabProps {
  accounts: Account[];
  pricingConfig: PricingConfig;
  ecommScanCache: EcommScanCache;
  onUpdateEcommCache: (id: string, entry: CacheEntry<EcommScanResult>) => void;
  inviteCache: InviteCache;
  onUpdateInviteCache: (id: string, entry: CacheEntry<DraftEmail>) => void;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

function prepKey(kind: PipelineKind, accountId: string): string {
  return `${kind}:${accountId}`;
}

export default function PipelineTab({
  accounts,
  pricingConfig,
  ecommScanCache,
  onUpdateEcommCache,
  inviteCache,
  onUpdateInviteCache,
}: PipelineTabProps) {
  const [pipelineKind, setPipelineKind] = useState<PipelineKind>("ecomm");

  // Population is seeded once (lazy initializer) so board membership stays
  // stable — only card values update live as scans/data change.
  const [ecommCandidates] = useState<Account[]>(() =>
    selectEcommCandidates(accounts, pricingConfig, ecommScanCache, 25),
  );
  const [innovationCandidates] = useState<Account[]>(() =>
    selectInnovationCandidates(accounts, 15),
  );

  const [ecommStageMap, setEcommStageMap] = useState<StageMap>(() =>
    Object.fromEntries(
      ecommCandidates.map((a) => [a.id, seedStage(a.accountName)]),
    ),
  );
  const [innovationStageMap, setInnovationStageMap] = useState<StageMap>(() =>
    Object.fromEntries(
      innovationCandidates.map((a) => [a.id, seedStage(a.accountName)]),
    ),
  );

  const [prepCache, setPrepCache] = useState<MeetingPrepCache>({});

  // --- Agentic triggers -----------------------------------------------
  // Keep every card currently sitting in "Automated AI Reachout" supplied
  // with a cached draft. Runs for both pipelines regardless of which is
  // toggled visible, so the inactive one keeps "coming alive" too.

  useEffect(() => {
    for (const account of ecommCandidates) {
      if (ecommStageMap[account.id] !== "reachout") continue;
      if (ecommScanCache[account.id]) continue; // already cached, any status
      onUpdateEcommCache(account.id, { status: "loading" });
      pipelineCallLimiter(() => fetchEcommScan(account, pricingConfig))
        .then((data) => onUpdateEcommCache(account.id, { status: "done", data }))
        .catch((err) =>
          onUpdateEcommCache(account.id, {
            status: "error",
            message: errorMessage(err),
          }),
        );
    }
    // Deliberately excludes ecommScanCache/onUpdateEcommCache/pricingConfig:
    // this should only re-scan the frontier when the stage map or candidate
    // list changes, not on every cache write it itself causes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecommStageMap, ecommCandidates]);

  useEffect(() => {
    for (const account of innovationCandidates) {
      if (innovationStageMap[account.id] !== "reachout") continue;
      if (inviteCache[account.id]) continue;
      onUpdateInviteCache(account.id, { status: "loading" });
      pipelineCallLimiter(() => fetchInvite(account))
        .then((data) => onUpdateInviteCache(account.id, { status: "done", data }))
        .catch((err) =>
          onUpdateInviteCache(account.id, {
            status: "error",
            message: errorMessage(err),
          }),
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innovationStageMap, innovationCandidates]);

  // Keep every card currently sitting in "Meeting Booked" supplied with a
  // cached 3-bullet prep brief.
  useEffect(() => {
    for (const account of ecommCandidates) {
      if (ecommStageMap[account.id] !== "meeting") continue;
      const key = prepKey("ecomm", account.id);
      if (prepCache[key]) continue;
      const { value } = computeEcommValue(account, pricingConfig, ecommScanCache);
      // Intentional: the card must show a loading spinner immediately on
      // stage entry, even while queued behind the concurrency cap — not
      // only once the limiter actually starts the fetch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrepCache((prev) => ({ ...prev, [key]: { status: "loading" } }));
      pipelineCallLimiter(() =>
        fetchMeetingPrep({
          accountName: account.accountName,
          pipelineKind: "ecomm",
          opportunityValueUSD: value,
          tier: account.pricingTier,
          notes: account.notes,
        }),
      )
        .then((data) =>
          setPrepCache((prev) => ({ ...prev, [key]: { status: "done", data } })),
        )
        .catch((err) =>
          setPrepCache((prev) => ({
            ...prev,
            [key]: { status: "error", message: errorMessage(err) },
          })),
        );
    }
    for (const account of innovationCandidates) {
      if (innovationStageMap[account.id] !== "meeting") continue;
      const key = prepKey("innovation", account.id);
      if (prepCache[key]) continue;
      const { value } = computeInnovationValue(account, pricingConfig);
      setPrepCache((prev) => ({ ...prev, [key]: { status: "loading" } }));
      pipelineCallLimiter(() =>
        fetchMeetingPrep({
          accountName: account.accountName,
          pipelineKind: "innovation",
          opportunityValueUSD: value,
          tier: account.pricingTier,
          notes: account.notes,
        }),
      )
        .then((data) =>
          setPrepCache((prev) => ({ ...prev, [key]: { status: "done", data } })),
        )
        .catch((err) =>
          setPrepCache((prev) => ({
            ...prev,
            [key]: { status: "error", message: errorMessage(err) },
          })),
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecommStageMap, innovationStageMap, ecommCandidates, innovationCandidates]);

  // --- Stage mutation ----------------------------------------------------

  function advanceStage(kind: PipelineKind, accountId: string) {
    const setMap = kind === "ecomm" ? setEcommStageMap : setInnovationStageMap;
    setMap((prev) => {
      const current = prev[accountId];
      const idx = PIPELINE_STAGES.findIndex((s) => s.id === current);
      if (idx === -1 || idx >= PIPELINE_STAGES.length - 1) return prev;
      return { ...prev, [accountId]: PIPELINE_STAGES[idx + 1].id };
    });
  }

  function setStage(kind: PipelineKind, accountId: string, stage: StageId) {
    const setMap = kind === "ecomm" ? setEcommStageMap : setInnovationStageMap;
    setMap((prev) => ({ ...prev, [accountId]: stage }));
  }

  // --- Card data -----------------------------------------------------

  const ecommCards: PipelineCardData[] = useMemo(
    () =>
      ecommCandidates.map((account) => {
        const { value, breakdown } = computeEcommValue(
          account,
          pricingConfig,
          ecommScanCache,
        );
        const scanEntry = ecommScanCache[account.id];
        const reachout: CacheEntry<DraftEmail> | undefined =
          scanEntry === undefined
            ? undefined
            : scanEntry.status === "done"
              ? { status: "done", data: scanEntry.data.draftEmail }
              : scanEntry.status === "loading"
                ? { status: "loading" }
                : { status: "error", message: scanEntry.message };
        return {
          id: account.id,
          accountName: account.accountName,
          tier: account.pricingTier,
          value,
          breakdown,
          stage: ecommStageMap[account.id] ?? "identified",
          reachout,
          prep: prepCache[prepKey("ecomm", account.id)],
        };
      }),
    [ecommCandidates, pricingConfig, ecommScanCache, ecommStageMap, prepCache],
  );

  const innovationCards: PipelineCardData[] = useMemo(
    () =>
      innovationCandidates.map((account) => {
        const { value, breakdown } = computeInnovationValue(
          account,
          pricingConfig,
        );
        return {
          id: account.id,
          accountName: account.accountName,
          tier: account.pricingTier,
          value,
          breakdown,
          stage: innovationStageMap[account.id] ?? "identified",
          reachout: inviteCache[account.id],
          prep: prepCache[prepKey("innovation", account.id)],
        };
      }),
    [innovationCandidates, pricingConfig, innovationStageMap, inviteCache, prepCache],
  );

  const activeCards = pipelineKind === "ecomm" ? ecommCards : innovationCards;

  if (accounts.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Opportunity Funnel
        </h2>
        <p className="text-sm text-slate-500">
          Deal-by-deal funnel for both growth plays. Advance stages
          manually — agents draft reachout and meeting prep automatically
          as cards arrive.
        </p>
      </div>

      <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          onClick={() => setPipelineKind("ecomm")}
          className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            pipelineKind === "ecomm"
              ? "bg-card text-indigo shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          E-Commerce
        </button>
        <button
          onClick={() => setPipelineKind("innovation")}
          className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            pipelineKind === "innovation"
              ? "bg-card text-indigo shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Innovation Partners
        </button>
      </div>

      <PipelineFunnel
        cards={activeCards}
        onAdvance={(id) => advanceStage(pipelineKind, id)}
        onSetStage={(id, stage) => setStage(pipelineKind, id, stage)}
        emptyMessage={
          pipelineKind === "ecomm"
            ? "No e-commerce opportunity accounts found — need accounts with $0 ValPay GMV or online-store signals in Notes."
            : "No Innovation Partner candidates found — need accounts with a positive Avg Yearly Custom Work Value."
        }
      />
    </div>
  );
}
