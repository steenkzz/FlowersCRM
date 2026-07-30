import {
  SCORING_METRICS,
  type Account,
  type MetricKey,
  type MetricWeights,
  type ScoredAccount,
} from "./types";

function minMax(accounts: Account[], key: MetricKey): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const a of accounts) {
    const v = a[key];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 0];
  return [min, max];
}

export function scoreAccounts(
  accounts: Account[],
  weights: MetricWeights,
): ScoredAccount[] {
  const ranges = Object.fromEntries(
    SCORING_METRICS.map((m) => [m.key, minMax(accounts, m.key)]),
  ) as Record<MetricKey, [number, number]>;

  const totalWeight = SCORING_METRICS.reduce(
    (sum, m) => sum + Math.max(0, weights[m.key] ?? 0),
    0,
  );

  return accounts.map((account) => {
    const normalized = {} as Record<MetricKey, number>;
    let weightedSum = 0;

    for (const m of SCORING_METRICS) {
      const [min, max] = ranges[m.key];
      const n = max === min ? 1 : (account[m.key] - min) / (max - min);
      normalized[m.key] = Math.max(0, Math.min(1, n));
      const w = Math.max(0, weights[m.key] ?? 0);
      weightedSum += normalized[m.key] * w;
    }

    const score =
      totalWeight > 0
        ? Math.round((weightedSum / totalWeight) * 100)
        : Math.round(
            (Object.values(normalized).reduce((a, b) => a + b, 0) /
              SCORING_METRICS.length) *
              100,
          );

    return { account, score: Math.max(0, Math.min(100, score)), normalized };
  });
}
