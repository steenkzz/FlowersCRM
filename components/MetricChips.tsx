import { SCORING_METRICS, type Account, type MetricKey } from "@/lib/types";
import { formatUSD, formatPercent, formatCompactNumber } from "@/lib/format";

function formatMetric(key: MetricKey, value: number): string {
  if (key === "revenueGrowthYoY") return formatPercent(value);
  if (key === "customersOnFile") return formatCompactNumber(value);
  return formatUSD(value);
}

interface MetricChipsProps {
  account: Account;
  normalized: Record<MetricKey, number>;
}

export default function MetricChips({ account, normalized }: MetricChipsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {SCORING_METRICS.map((metric) => (
        <div
          key={metric.key}
          className="flex flex-col gap-1 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5"
        >
          <span className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {metric.label}
          </span>
          <span className="text-xs font-semibold tabular-nums text-slate-700">
            {formatMetric(metric.key, account[metric.key])}
          </span>
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo"
              style={{ width: `${Math.round(normalized[metric.key] * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
