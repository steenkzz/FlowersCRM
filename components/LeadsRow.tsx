"use client";

import { useState } from "react";
import ScoreBadge from "./ScoreBadge";
import MetricChips from "./MetricChips";
import type { CacheEntry, ExplanationResult, MetricKey, ScoredAccount } from "@/lib/types";

interface LeadsRowProps {
  scored: ScoredAccount;
  rank: number;
  normalized: Record<MetricKey, number>;
  explanation: CacheEntry<ExplanationResult> | undefined;
  onRequestExplanation: () => void;
}

export default function LeadsRow({
  scored,
  rank,
  normalized,
  explanation,
  onRequestExplanation,
}: LeadsRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { account, score } = scored;

  function handleToggle() {
    const next = !isOpen;
    setIsOpen(next);
    if (next && explanation === undefined) {
      onRequestExplanation();
    }
  }

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={handleToggle}
        className="flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <div className="flex items-start gap-4">
          <span className="w-5 shrink-0 pt-1 text-xs font-medium text-slate-300 tabular-nums">
            {rank}
          </span>
          <div className="w-12 shrink-0">
            <ScoreBadge score={score} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold text-slate-900">
                {account.accountName || "—"}
              </span>
              {account.accountType && (
                <span className="rounded-full bg-indigo-light px-2 py-0.5 text-[11px] font-medium text-indigo">
                  {account.accountType}
                </span>
              )}
              {account.region && (
                <span className="text-xs text-slate-400">{account.region}</span>
              )}
            </div>
            <p className="truncate text-sm text-slate-500">
              {account.contactName || "No contact"}
              {account.contactRole ? ` · ${account.contactRole}` : ""}
            </p>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={`mt-1.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        </div>
        <div className="sm:pl-[100px]">
          <MetricChips account={account} normalized={normalized} />
        </div>
      </button>

      {isOpen && (
        <div className="animate-fade-in-up border-t border-slate-100 bg-slate-50 px-4 py-4 sm:pl-[132px]">
          {(explanation === undefined || explanation.status === "loading") && (
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-indigo" />
              Generating explanation…
            </p>
          )}
          {explanation?.status === "error" && (
            <p className="text-sm text-red-500">
              Couldn&apos;t generate an explanation ({explanation.message}).
            </p>
          )}
          {explanation?.status === "done" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-slate-700">
                {explanation.data.explanation}
              </p>
              <p className="text-sm">
                <span className="font-semibold text-slate-900">
                  Next action:{" "}
                </span>
                <span className="text-slate-700">
                  {explanation.data.nextAction}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
