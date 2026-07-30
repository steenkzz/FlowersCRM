"use client";

import { useState } from "react";
import ScoreBadge from "./ScoreBadge";
import type { EnrichedAccount } from "@/lib/types";

interface ResultRowProps {
  account: EnrichedAccount;
}

function StatusPill({ status }: { status: EnrichedAccount["status"] }) {
  if (status === "researching" || status === "queued") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-indigo">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-indigo" />
        {status === "researching" ? "researching…" : "queued…"}
      </span>
    );
  }
  if (status === "error") {
    return <span className="text-xs font-medium text-red-500">failed</span>;
  }
  return null;
}

export default function ResultRow({ account }: ResultRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const enrichment = account.enrichment;

  async function handleCopy() {
    if (!enrichment) return;
    const text = `Subject: ${enrichment.draftEmail.subject}\n\n${enrichment.draftEmail.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — fail silently, button just won't confirm
    }
  }

  const isEnriched = account.status === "done" && !!enrichment;

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => isEnriched && setExpanded((v) => !v)}
        disabled={!isEnriched}
        className={`flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors ${
          isEnriched ? "cursor-pointer hover:bg-slate-50" : "cursor-default"
        }`}
      >
        <div className="w-10 shrink-0">
          {isEnriched ? (
            <ScoreBadge score={enrichment.aiOpportunityScore} />
          ) : (
            <span className="inline-block h-6 w-10 rounded-full bg-slate-100" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-slate-900">
              {account.company}
            </span>
            <StatusPill status={account.status} />
          </div>
          <p className="truncate text-sm text-slate-500">
            {isEnriched
              ? enrichment!.scoreReasoning
              : account.status === "error"
                ? account.error || "Enrichment failed for this account."
                : "Waiting for research to run…"}
          </p>
        </div>
        {isEnriched && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        )}
      </button>

      {expanded && isEnriched && (
        <div className="animate-fade-in-up grid grid-cols-1 gap-6 border-t border-slate-100 bg-slate-50 px-4 py-5 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Full reasoning
              </h4>
              <p className="text-sm text-slate-700">
                {enrichment!.scoreReasoning}
              </p>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Web findings
              </h4>
              {enrichment!.webFindings.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {enrichment!.webFindings.map((finding, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm text-slate-700"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo" />
                      {finding}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">
                  No public findings surfaced.
                </p>
              )}
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recommended action
              </h4>
              <p className="text-sm text-slate-700">
                {enrichment!.recommendedAction}
              </p>
            </div>
          </div>

          <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Draft email
              </h4>
              <button
                onClick={handleCopy}
                className="rounded-md bg-indigo px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo/90"
              >
                {copied ? "Copied ✓" : "Copy email"}
              </button>
            </div>
            <p className="mb-2 text-sm font-semibold text-slate-900">
              {enrichment!.draftEmail.subject}
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {enrichment!.draftEmail.body}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
