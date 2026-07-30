"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import UploadZone from "@/components/UploadZone";
import AccountsTable from "@/components/AccountsTable";
import ActivityFeed from "@/components/ActivityFeed";
import ResultsList from "@/components/ResultsList";
import { parseExcelFile } from "@/lib/excel";
import { runEnrichment, toEnrichedAccount } from "@/lib/enrichment";
import type { ActivityEvent, EnrichedAccount } from "@/lib/types";

type Stage = "upload" | "review" | "results";

let activitySeq = 0;

export default function Home() {
  const [stage, setStage] = useState<Stage>("upload");
  const [accounts, setAccounts] = useState<EnrichedAccount[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const handleFile = useCallback(async (file: File) => {
    setParseError(null);
    setIsParsing(true);
    try {
      const { accounts: parsed, rowCount } = await parseExcelFile(file);
      if (rowCount === 0) {
        setParseError(
          "No usable rows found. Check that the first sheet has a header row.",
        );
        setAccounts([]);
      } else {
        setAccounts(parsed.map(toEnrichedAccount));
        setFileName(file.name);
        setActivity([]);
        setStage("review");
      }
    } catch {
      setParseError(
        "Couldn't read that file. Make sure it's a valid .xlsx export.",
      );
    } finally {
      setIsParsing(false);
    }
  }, []);

  const updateAccount = useCallback(
    (id: string, patch: Partial<EnrichedAccount>) => {
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      );
    },
    [],
  );

  const pushActivity = useCallback(
    (event: Omit<ActivityEvent, "id" | "timestamp">) => {
      activitySeq += 1;
      setActivity((prev) => [
        ...prev,
        { ...event, id: `evt-${activitySeq}`, timestamp: Date.now() },
      ]);
    },
    [],
  );

  const startEnrichment = useCallback(async () => {
    const myRun = ++runIdRef.current;
    setStage("results");
    setIsEnriching(true);
    try {
      await runEnrichment(accounts, {
        concurrency: 4,
        onUpdate: (id, patch) => {
          if (runIdRef.current === myRun) updateAccount(id, patch);
        },
        onActivity: (event) => {
          if (runIdRef.current === myRun) pushActivity(event);
        },
      });
    } finally {
      if (runIdRef.current === myRun) setIsEnriching(false);
    }
  }, [accounts, updateAccount, pushActivity]);

  const reset = useCallback(() => {
    runIdRef.current += 1;
    setAccounts([]);
    setActivity([]);
    setFileName(null);
    setStage("upload");
    setIsEnriching(false);
  }, []);

  const stats = useMemo(() => {
    const done = accounts.filter((a) => a.status === "done" && a.enrichment);
    const high = done.filter((a) => (a.enrichment?.aiOpportunityScore ?? 0) >= 75);
    const avg =
      done.length > 0
        ? Math.round(
            done.reduce((sum, a) => sum + (a.enrichment?.aiOpportunityScore ?? 0), 0) /
              done.length,
          )
        : null;
    return { doneCount: done.length, highCount: high.length, avg };
  }, [accounts]);

  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo text-xs font-bold text-white">
              IC
            </div>
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              Intelligence CRM
            </span>
          </div>
          {fileName && stage !== "upload" && (
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400">{fileName}</span>
              <button
                onClick={reset}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Upload a different file
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-16">
        {stage === "upload" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10 text-center">
            <div className="flex flex-col items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
                Don&apos;t migrate your CRM.
              </h1>
              <p className="max-w-lg text-lg text-slate-500">
                Drop in your spreadsheet and get an intelligent CRM in 30
                seconds — every account researched, scored, and ready for
                outreach.
              </p>
            </div>
            <UploadZone
              onFile={handleFile}
              isLoading={isParsing}
              error={parseError}
            />
          </div>
        )}

        {stage === "review" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {accounts.length} accounts parsed
                </h2>
                <p className="text-sm text-slate-500">
                  Review the raw import, then run AI research + scoring on
                  every account.
                </p>
              </div>
              <button
                onClick={startEnrichment}
                className="rounded-lg bg-indigo px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo/90"
              >
                Research &amp; score all accounts →
              </button>
            </div>
            <AccountsTable accounts={accounts} />
          </div>
        )}

        {stage === "results" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {isEnriching
                    ? `Researching ${accounts.length} accounts…`
                    : "Ranked by AI opportunity"}
                </h2>
                <p className="text-sm text-slate-500">
                  {stats.doneCount}/{accounts.length} enriched
                  {stats.avg !== null && ` · avg score ${stats.avg}`}
                  {stats.highCount > 0 && ` · ${stats.highCount} high-priority`}
                </p>
              </div>
              {!isEnriching && (
                <button
                  onClick={startEnrichment}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Re-run failed accounts
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
              <ResultsList accounts={accounts} />
              <ActivityFeed events={activity} isRunning={isEnriching} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
