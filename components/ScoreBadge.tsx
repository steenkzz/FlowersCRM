interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md";
}

export default function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const tier =
    score >= 75 ? "high" : score >= 50 ? "medium" : "low";

  const styles: Record<string, string> = {
    high: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-slate-100 text-slate-500 border-slate-200",
  };

  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold tabular-nums ${styles[tier]} ${sizeClasses}`}
    >
      {score}
    </span>
  );
}
