import { PIPELINE_STAGES } from "./types";
import type { Account, ColumnStageId, EcommScanCache, StageId } from "./types";
import {
  computeSponsorShare,
  projectSeatGrowth,
  resolveTier,
  type PricingConfig,
} from "./pricing";

const ECOMM_SIGNAL_RE =
  /online|e-?commerce|webshop|web[- ]?store|storefront|shopify|checkout/i;

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const SEED_STAGE_ORDER: ColumnStageId[] = [
  "identified",
  "reachout",
  "meeting",
  "sent",
  "paid",
];
// Weighted toward early stages; sums to 1.
const SEED_WEIGHTS = [0.35, 0.25, 0.2, 0.12, 0.08];

/** Deterministic pseudo-random seed stage (1-5) from the account name, so
 * reloading the same file always seeds the board the same way. */
export function seedStage(accountName: string): StageId {
  const r = (hashString(accountName) % 10000) / 10000;
  let cumulative = 0;
  for (let i = 0; i < SEED_WEIGHTS.length; i++) {
    cumulative += SEED_WEIGHTS[i];
    if (r < cumulative) return SEED_STAGE_ORDER[i];
  }
  return SEED_STAGE_ORDER[SEED_STAGE_ORDER.length - 1];
}

export interface ValueBreakdownItem {
  label: string;
  amount: number;
}

export interface OpportunityValue {
  value: number;
  breakdown: ValueBreakdownItem[];
}

const ONLINE_SHARE_ESTIMATE = 0.15;
const COMMISSION_RATE = 0.01;

export function computeEcommValue(
  account: Account,
  pricingConfig: PricingConfig,
  scanCache: EcommScanCache,
): OpportunityValue {
  const scanEntry = scanCache[account.id];
  const hasScan = scanEntry?.status === "done";
  const commissionPart = hasScan
    ? scanEntry.data.commissionRevenueForUs
    : Math.round(
        account.annualRevenueUSD * ONLINE_SHARE_ESTIMATE * COMMISSION_RATE,
      );

  const tier = resolveTier(
    account.pricingTier,
    account.annualRevenueUSD,
    pricingConfig,
  );
  const { arrDelta } = projectSeatGrowth(
    tier,
    account.revenueGrowthYoY,
    pricingConfig,
  );

  return {
    value: commissionPart + arrDelta,
    breakdown: [
      {
        label: hasScan
          ? "Commission — 1% of scanned online GMV"
          : "Commission — 1% of estimated online GMV",
        amount: commissionPart,
      },
      { label: "ARR from projected seat growth", amount: arrDelta },
    ],
  };
}

export function computeInnovationValue(
  account: Account,
  pricingConfig: PricingConfig,
): OpportunityValue {
  const { ourNetAddOnRevenue } = computeSponsorShare(
    account.avgCustomWorkValueUSD,
    pricingConfig,
  );
  return {
    value: account.avgCustomWorkValueUSD + ourNetAddOnRevenue,
    breakdown: [
      {
        label: "Avg yearly custom work value",
        amount: account.avgCustomWorkValueUSD,
      },
      {
        label: "Add-on revenue upside (net of sponsor share)",
        amount: ourNetAddOnRevenue,
      },
    ],
  };
}

export function isEcommCandidate(account: Account): boolean {
  return account.valPayGMVUSD === 0 || ECOMM_SIGNAL_RE.test(account.notes);
}

export function selectEcommCandidates(
  accounts: Account[],
  pricingConfig: PricingConfig,
  scanCache: EcommScanCache,
  limit = 25,
): Account[] {
  return accounts
    .filter(isEcommCandidate)
    .map((account) => ({
      account,
      value: computeEcommValue(account, pricingConfig, scanCache).value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((x) => x.account);
}

export function selectInnovationCandidates(
  accounts: Account[],
  limit = 15,
): Account[] {
  return [...accounts]
    .filter((a) => a.avgCustomWorkValueUSD > 0)
    .sort((a, b) => b.avgCustomWorkValueUSD - a.avgCustomWorkValueUSD)
    .slice(0, limit);
}

export interface PipelineTotals {
  totalValue: number;
  weightedValue: number;
  closedWonValue: number;
  lostCount: number;
  lostValue: number;
}

/** Total/weighted totals cover every non-lost card (stages 1-6); Closed
 * Lost is reported separately and excluded from the pipeline totals. */
export function computePipelineTotals(
  cards: { stage: StageId; value: number }[],
): PipelineTotals {
  let totalValue = 0;
  let weightedValue = 0;
  let closedWonValue = 0;
  let lostCount = 0;
  let lostValue = 0;

  for (const card of cards) {
    if (card.stage === "lost") {
      lostCount += 1;
      lostValue += card.value;
      continue;
    }
    const stageInfo = PIPELINE_STAGES.find((s) => s.id === card.stage);
    const probability = stageInfo?.probability ?? 0;
    totalValue += card.value;
    weightedValue += card.value * probability;
    if (card.stage === "won") closedWonValue += card.value;
  }

  return { totalValue, weightedValue, closedWonValue, lostCount, lostValue };
}
