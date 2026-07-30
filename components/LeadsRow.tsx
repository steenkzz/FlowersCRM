"use client";

import ScoreBadge from "./ScoreBadge";
import MetricChips from "./MetricChips";
import type { MetricKey, ScoredAccount } from "@/lib/types";

interface LeadsRowProps {
  scored: ScoredAccount;
  rank: number;
  normalized: Record<MetricKey, number>;
}

export default function LeadsRow({ scored, rank, normalized }: LeadsRowProps) {
  const { account, score } = scored;

  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 last:border-0">
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
      </div>
      <div className="sm:pl-[100px]">
        <MetricChips account={account} normalized={normalized} />
      </div>
    </div>
  );
}
