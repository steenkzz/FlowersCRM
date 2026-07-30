"use client";

import LeadsRow from "./LeadsRow";
import type { ExplanationCache, ScoredAccount } from "@/lib/types";

interface LeadsTableProps {
  scored: ScoredAccount[];
  explanations: ExplanationCache;
  onRequestExplanation: (scored: ScoredAccount) => void;
}

export default function LeadsTable({
  scored,
  explanations,
  onRequestExplanation,
}: LeadsTableProps) {
  if (scored.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        No accounts to show yet.
      </div>
    );
  }

  const sorted = [...scored].sort((a, b) => b.score - a.score);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      {sorted.map((s, i) => (
        <LeadsRow
          key={s.account.id}
          scored={s}
          rank={i + 1}
          normalized={s.normalized}
          explanation={explanations[s.account.id]}
          onRequestExplanation={() => onRequestExplanation(s)}
        />
      ))}
    </div>
  );
}
