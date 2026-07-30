"use client";

import { useCallback, useMemo, useState } from "react";
import WeightSliders from "@/components/WeightSliders";
import LeadsTable from "@/components/LeadsTable";
import { scoreAccounts } from "@/lib/scoring";
import type {
  Account,
  ExplanationCache,
  ExplanationResult,
  MetricWeights,
  ScoredAccount,
} from "@/lib/types";

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
  const [explanations, setExplanations] = useState<ExplanationCache>({});

  const scored = useMemo(
    () => scoreAccounts(accounts, weights),
    [accounts, weights],
  );

  const requestExplanation = useCallback(async (s: ScoredAccount) => {
    const { account, score } = s;
    setExplanations((prev) => ({ ...prev, [account.id]: { status: "loading" } }));

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: account.accountName,
          accountType: account.accountType,
          region: account.region,
          score,
          annualRevenueUSD: account.annualRevenueUSD,
          customersOnFile: account.customersOnFile,
          valPayGMVUSD: account.valPayGMVUSD,
          revenueGrowthYoY: account.revenueGrowthYoY,
          avgCustomWorkValueUSD: account.avgCustomWorkValueUSD,
          avgSupportValueUSD: account.avgSupportValueUSD,
          notes: account.notes,
        }),
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const data: ExplanationResult = await res.json();
      setExplanations((prev) => ({ ...prev, [account.id]: { status: "done", data } }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setExplanations((prev) => ({
        ...prev,
        [account.id]: { status: "error", message },
      }));
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Qualified leads
        </h2>
        <p className="text-sm text-slate-500">
          Deterministic score from six weighted metrics — drag the sliders to
          re-rank instantly. Click a row for an AI explanation.
        </p>
      </div>
      <WeightSliders weights={weights} onChange={onWeightsChange} />
      <LeadsTable
        scored={scored}
        explanations={explanations}
        onRequestExplanation={requestExplanation}
      />
    </div>
  );
}
