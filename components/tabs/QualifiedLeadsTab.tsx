"use client";

import { useMemo } from "react";
import WeightSliders from "@/components/WeightSliders";
import LeadsTable from "@/components/LeadsTable";
import { scoreAccounts } from "@/lib/scoring";
import type { Account, MetricWeights } from "@/lib/types";

interface QualifiedLeadsTabProps {
  accounts: Account[];
  weights: MetricWeights;
  onWeightsChange: (weights: MetricWeights) => void;
}

export default function QualifiedLeadsTab({
  accounts,
  weights,
  onWeightsChange,
}: QualifiedLeadsTabProps) {
  const scored = useMemo(
    () => scoreAccounts(accounts, weights),
    [accounts, weights],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Qualified leads
        </h2>
        <p className="text-sm text-slate-500">
          Deterministic score from six weighted metrics — drag the sliders to
          re-rank instantly.
        </p>
      </div>
      <WeightSliders weights={weights} onChange={onWeightsChange} />
      <LeadsTable scored={scored} />
    </div>
  );
}
