export interface PricingConfig {
  businessBase: number;
  enterpriseBase: number;
  userBlockSize: number;
  userBlockBusiness: number;
  userBlockEnterprise: number;
  usersIncludedBusiness: number;
  usersIncludedEnterprise: number;
  tierGateRevenueMillions: number;
  sponsorSharePct: number;
  sponsorPayoutCap: number;
  sunsetWindowMonths: number;
  addOnPerModule: number;
  customExclusiveRate: number;
  customRoadmapRate: number;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  businessBase: 10000,
  enterpriseBase: 30000,
  userBlockSize: 5,
  userBlockBusiness: 1500,
  userBlockEnterprise: 1200,
  usersIncludedBusiness: 5,
  usersIncludedEnterprise: 20,
  tierGateRevenueMillions: 2,
  sponsorSharePct: 0.18,
  sponsorPayoutCap: 1.5,
  sunsetWindowMonths: 24,
  addOnPerModule: 200,
  customExclusiveRate: 250,
  customRoadmapRate: 100,
};

export type PricingTier = "Business" | "Enterprise";

/**
 * Derives a tier from revenue when the sheet doesn't supply "Pricing Tier"
 * directly. tierGateRevenueMillions is the exact knob this exists for.
 */
export function deriveTier(
  annualRevenueUSD: number,
  pricingConfig: PricingConfig,
): PricingTier {
  return annualRevenueUSD >= pricingConfig.tierGateRevenueMillions * 1_000_000
    ? "Enterprise"
    : "Business";
}

export function resolveTier(
  pricingTierRaw: string,
  annualRevenueUSD: number,
  pricingConfig: PricingConfig,
): PricingTier {
  const normalized = pricingTierRaw.trim().toLowerCase();
  if (normalized.startsWith("ent")) return "Enterprise";
  if (normalized.startsWith("bus")) return "Business";
  return deriveTier(annualRevenueUSD, pricingConfig);
}

export function tierBasePrice(tier: PricingTier, pricingConfig: PricingConfig): number {
  return tier === "Enterprise" ? pricingConfig.enterpriseBase : pricingConfig.businessBase;
}

export function tierIncludedUsers(tier: PricingTier, pricingConfig: PricingConfig): number {
  return tier === "Enterprise"
    ? pricingConfig.usersIncludedEnterprise
    : pricingConfig.usersIncludedBusiness;
}

export function tierBlockPrice(tier: PricingTier, pricingConfig: PricingConfig): number {
  return tier === "Enterprise"
    ? pricingConfig.userBlockEnterprise
    : pricingConfig.userBlockBusiness;
}

/**
 * Baseline estimate for "Est. License ARR (USD)" when the sheet doesn't
 * supply it: the account's tier base price, assuming no seat overage.
 */
export function estimateLicenseARR(tier: PricingTier, pricingConfig: PricingConfig): number {
  return tierBasePrice(tier, pricingConfig);
}

export interface SeatGrowthProjection {
  tier: PricingTier;
  currentSeats: number;
  projectedSeats: number;
  extraSeats: number;
  extraBlocks: number;
  arrDelta: number;
}

/**
 * Projects seat growth from revenue growth and prices the resulting extra
 * license blocks. "Current seats" is approximated as the tier's included
 * user count — the CRM export has no direct current-seat-count field.
 */
export function projectSeatGrowth(
  tier: PricingTier,
  revenueGrowthYoY: number,
  pricingConfig: PricingConfig,
): SeatGrowthProjection {
  const currentSeats = tierIncludedUsers(tier, pricingConfig);
  const growthFactor = 1 + revenueGrowthYoY / 100;
  const projectedSeats = Math.max(0, currentSeats * growthFactor);
  const extraSeats = Math.max(0, projectedSeats - currentSeats);
  const extraBlocks = Math.ceil(extraSeats / pricingConfig.userBlockSize);
  const arrDelta = extraBlocks * tierBlockPrice(tier, pricingConfig);
  return { tier, currentSeats, projectedSeats, extraSeats, extraBlocks, arrDelta };
}

export interface SponsorShareBreakdown {
  totalAddOnRevenue: number;
  sponsorPayout: number;
  ourNetAddOnRevenue: number;
}

const INNOVATION_BASE_ACCOUNTS = 200;
const INNOVATION_ADOPTION_RATE = 0.1;
const MONTHS_PER_YEAR = 12;

/**
 * Sponsor-share economics for an Innovation Partner's productized add-on:
 * assumes it sells to 10% of a 200-account base for a year, sponsor gets a
 * share capped at a multiple of their own custom-work value.
 */
export function computeSponsorShare(
  avgCustomWorkValueUSD: number,
  pricingConfig: PricingConfig,
): SponsorShareBreakdown {
  const adoptingAccounts = INNOVATION_BASE_ACCOUNTS * INNOVATION_ADOPTION_RATE;
  const totalAddOnRevenue =
    adoptingAccounts * pricingConfig.addOnPerModule * MONTHS_PER_YEAR;
  const uncappedPayout = totalAddOnRevenue * pricingConfig.sponsorSharePct;
  const payoutCap = pricingConfig.sponsorPayoutCap * avgCustomWorkValueUSD;
  const sponsorPayout = Math.min(uncappedPayout, payoutCap);
  return {
    totalAddOnRevenue,
    sponsorPayout,
    ourNetAddOnRevenue: totalAddOnRevenue - sponsorPayout,
  };
}
