"use client";

import ResultRow from "./ResultRow";
import type { EnrichedAccount } from "@/lib/types";

interface ResultsListProps {
  accounts: EnrichedAccount[];
}

function rank(account: EnrichedAccount): number {
  if (account.status === "done" && account.enrichment) {
    return account.enrichment.aiOpportunityScore;
  }
  return -1;
}

export default function ResultsList({ accounts }: ResultsListProps) {
  const sorted = [...accounts].sort((a, b) => rank(b) - rank(a));

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        No accounts to show yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      {sorted.map((account) => (
        <ResultRow key={account.id} account={account} />
      ))}
    </div>
  );
}
