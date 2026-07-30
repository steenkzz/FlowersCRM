"use client";

import { useMemo } from "react";
import PipelineCard, { type PipelineCardData } from "./pipeline/PipelineCard";
import { computePipelineTotals } from "@/lib/pipeline";
import { formatUSD } from "@/lib/format";
import { PIPELINE_STAGES } from "@/lib/types";
import type { StageId } from "@/lib/types";

interface PipelineFunnelProps {
  cards: PipelineCardData[];
  onAdvance: (accountId: string) => void;
  onSetStage: (accountId: string, stage: StageId) => void;
  emptyMessage: string;
}

export default function PipelineFunnel({
  cards,
  onAdvance,
  onSetStage,
  emptyMessage,
}: PipelineFunnelProps) {
  const totals = useMemo(() => computePipelineTotals(cards), [cards]);

  const lostCards = cards.filter((c) => c.stage === "lost");

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-indigo/20 bg-indigo-light p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-indigo/80">
            Total pipeline value
          </p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-indigo transition-all duration-300">
            {formatUSD(totals.totalValue)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-indigo/80">
            Weighted pipeline value
          </p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-indigo transition-all duration-300">
            {formatUSD(totals.weightedValue)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-indigo/80">Closed won</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-indigo transition-all duration-300">
            {formatUSD(totals.closedWonValue)}
          </p>
        </div>
      </div>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, minmax(0, 1fr))`,
        }}
      >
        {PIPELINE_STAGES.map((stage) => {
          const stageCards = cards.filter((c) => c.stage === stage.id);
          const sum = stageCards.reduce((s, c) => s + c.value, 0);
          return (
            <div
              key={stage.id}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div>
                <p className="truncate text-xs font-semibold text-slate-700">
                  {stage.label}
                </p>
                <p className="text-[11px] text-slate-400">
                  {stageCards.length} · {formatUSD(sum)}
                </p>
              </div>
              <div className="flex max-h-[65vh] flex-col gap-2.5 overflow-y-auto pr-0.5">
                {stageCards.map((card) => (
                  <PipelineCard
                    key={card.id}
                    card={card}
                    onAdvance={onAdvance}
                    onSetStage={onSetStage}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {lostCards.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="mb-1.5 text-xs font-semibold text-slate-500">
            Closed lost — {lostCards.length} · {formatUSD(totals.lostValue)}
          </p>
          <div className="flex flex-wrap gap-2">
            {lostCards.map((card) => (
              <span
                key={card.id}
                className="rounded-full border border-slate-200 bg-card px-2.5 py-1 text-xs text-slate-500"
              >
                {card.accountName} · {formatUSD(card.value)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
