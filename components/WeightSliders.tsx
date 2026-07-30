"use client";

import { SCORING_METRICS, DEFAULT_WEIGHTS, type MetricWeights } from "@/lib/types";

interface WeightSlidersProps {
  weights: MetricWeights;
  onChange: (weights: MetricWeights) => void;
}

export default function WeightSliders({ weights, onChange }: WeightSlidersProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Scoring weights
        </h3>
        <button
          onClick={() => onChange({ ...DEFAULT_WEIGHTS })}
          className="text-xs font-medium text-indigo hover:underline"
        >
          Reset to equal
        </button>
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCORING_METRICS.map((metric) => (
          <div key={metric.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">{metric.label}</span>
              <span className="tabular-nums text-slate-400">
                {weights[metric.key]}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={weights[metric.key]}
              onChange={(e) =>
                onChange({
                  ...weights,
                  [metric.key]: Number(e.target.value),
                })
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
