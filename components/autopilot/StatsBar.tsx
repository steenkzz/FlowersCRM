import { formatUSD } from "@/lib/format";
import type { AutopilotStats } from "@/lib/autopilotTypes";

interface StatsBarProps {
  stats: AutopilotStats;
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem}s`;
}

export default function StatsBar({ stats }: StatsBarProps) {
  const avgCycleMs =
    stats.cycleTimesMs.length > 0
      ? stats.cycleTimesMs.reduce((a, b) => a + b, 0) / stats.cycleTimesMs.length
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-indigo/20 bg-indigo-light p-5 sm:grid-cols-3">
      <div>
        <p className="text-xs font-medium text-indigo/80">Avg cycle time</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-indigo">
          {avgCycleMs > 0 ? formatDuration(avgCycleMs) : "—"}
        </p>
      </div>
      <div>
        <p className="text-xs font-medium text-indigo/80">
          Add-ons shipped this session
        </p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-indigo">
          {stats.addonsShipped}
        </p>
      </div>
      <div>
        <p className="text-xs font-medium text-indigo/80">New ARR captured</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-indigo">
          {formatUSD(stats.newARRCaptured)}
        </p>
      </div>
    </div>
  );
}
