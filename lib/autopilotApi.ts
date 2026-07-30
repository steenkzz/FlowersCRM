import type { PricingConfig } from "./pricing";
import type {
  AddonRequest,
  BuildResult,
  CustomerResponseResult,
  EvaluationResult,
} from "./autopilotTypes";
import type { DraftEmail } from "./types";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

export function fetchEvaluation(
  request: AddonRequest,
  pricingConfig: PricingConfig,
  account: { accountType: string; paymentStatus: string; npsScore: number; notes: string },
): Promise<EvaluationResult> {
  return postJson("/api/evaluate-request", {
    title: request.title,
    description: request.description,
    estBuildHours: request.estBuildHours,
    buildCostEstimate: request.buildCostEstimate,
    projectedAnnualSKURevenue: request.projectedAnnualSKURevenue,
    accountName: request.accountName,
    accountType: account.accountType,
    paymentStatus: account.paymentStatus,
    npsScore: account.npsScore,
    notes: account.notes,
    customExclusiveRate: pricingConfig.customExclusiveRate,
    customRoadmapRate: pricingConfig.customRoadmapRate,
  });
}

export function fetchCustomerResponse(
  request: AddonRequest,
  account: { paymentStatus: string; npsScore: number; notes: string },
  offerType: "quote" | "free",
  offerAmount: number,
  isFinalRound: boolean,
): Promise<CustomerResponseResult> {
  return postJson("/api/simulate-customer", {
    accountName: request.accountName,
    paymentStatus: account.paymentStatus,
    npsScore: account.npsScore,
    notes: account.notes,
    addonTitle: request.title,
    offerType,
    offerAmount,
    isFinalRound,
  });
}

export function fetchBuild(request: AddonRequest, notes: string): Promise<BuildResult> {
  return postJson("/api/build-addon", {
    title: request.title,
    description: request.description,
    accountName: request.accountName,
    notes,
  });
}

export function fetchSponsorShareEmail(
  request: AddonRequest,
  pricingConfig: PricingConfig,
): Promise<DraftEmail> {
  return postJson("/api/share-with-sponsor", {
    addonTitle: request.title,
    accountName: request.accountName,
    releaseNote: request.build?.releaseNote,
    sponsorSharePct: pricingConfig.sponsorSharePct,
    projectedAnnualSKURevenue: request.projectedAnnualSKURevenue,
  });
}
