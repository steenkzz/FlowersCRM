import type { Account } from "./types";
import type { AddonRequest } from "./autopilotTypes";

interface RequestTemplate {
  title: string;
  description: string;
  estBuildHours: number;
  buildCostEstimate: number;
  projectedAnnualSKURevenue: number;
}

// 12 seed requests. buildCostEstimate/projectedAnnualSKURevenue are chosen
// so the set naturally produces a mix of reject / quote / free outcomes.
export const SEED_REQUEST_TEMPLATES: RequestTemplate[] = [
  {
    title: "Bulk SKU import tool",
    description:
      "Import thousands of SKUs from a CSV/Excel file in one batch, with validation and duplicate detection.",
    estBuildHours: 32,
    buildCostEstimate: 2400,
    projectedAnnualSKURevenue: 9500,
  },
  {
    title: "Loyalty points widget",
    description:
      "Track and display customer loyalty points at checkout, with configurable earn/redeem rates.",
    estBuildHours: 60,
    buildCostEstimate: 4200,
    projectedAnnualSKURevenue: 42000,
  },
  {
    title: "Automated reorder alerts",
    description:
      "Alert the ops team when stock on any SKU drops below its reorder point, with a one-click PO draft.",
    estBuildHours: 45,
    buildCostEstimate: 3100,
    projectedAnnualSKURevenue: 38000,
  },
  {
    title: "Multi-warehouse stock sync",
    description:
      "Keep on-hand quantities in sync across multiple warehouse locations in near-real-time.",
    estBuildHours: 90,
    buildCostEstimate: 7200,
    projectedAnnualSKURevenue: 15000,
  },
  {
    title: "Custom invoice branding",
    description:
      "Let the account upload a logo and pick accent colors for their outgoing PDF invoices.",
    estBuildHours: 14,
    buildCostEstimate: 900,
    projectedAnnualSKURevenue: 1800,
  },
  {
    title: "Returns / RMA workflow",
    description:
      "A structured return-merchandise-authorization flow: request, approve, restock, refund.",
    estBuildHours: 70,
    buildCostEstimate: 5400,
    projectedAnnualSKURevenue: 21000,
  },
  {
    title: "Barcode label generator",
    description:
      "Generate and print custom barcode labels for a batch of SKUs directly from the ERP.",
    estBuildHours: 20,
    buildCostEstimate: 1500,
    projectedAnnualSKURevenue: 2600,
  },
  {
    title: "Supplier scorecard dashboard",
    description:
      "Score suppliers on on-time delivery, defect rate, and price stability over the last 12 months.",
    estBuildHours: 55,
    buildCostEstimate: 4100,
    projectedAnnualSKURevenue: 8200,
  },
  {
    title: "Gift card management",
    description:
      "Issue, redeem, and track balances on digital gift cards across all sales channels.",
    estBuildHours: 65,
    buildCostEstimate: 4800,
    projectedAnnualSKURevenue: 51000,
  },
  {
    title: "Seasonal demand forecasting",
    description:
      "Forecast SKU-level demand ahead of seasonal peaks using the last 3 years of order history.",
    estBuildHours: 110,
    buildCostEstimate: 9200,
    projectedAnnualSKURevenue: 19000,
  },
  {
    title: "Customer self-service portal",
    description:
      "Let end customers log in to view order status, past invoices, and reorder with one click.",
    estBuildHours: 95,
    buildCostEstimate: 7600,
    projectedAnnualSKURevenue: 63000,
  },
  {
    title: "Sales rep commission tracker",
    description:
      "Automatically calculate and display commission owed per rep based on closed sales.",
    estBuildHours: 8,
    buildCostEstimate: 600,
    projectedAnnualSKURevenue: 900,
  },
];

// Pool the flywheel picks from when a new inbound request is spawned after
// a successful cycle. Deliberately similar in shape to the seed set.
export const FOLLOWUP_REQUEST_TEMPLATES: RequestTemplate[] = [
  {
    title: "Loyalty points redemption at POS",
    description:
      "Extend the loyalty widget so points can be redeemed directly at the point of sale, not just online.",
    estBuildHours: 26,
    buildCostEstimate: 1900,
    projectedAnnualSKURevenue: 24000,
  },
  {
    title: "Automated low-stock reorder to supplier",
    description:
      "Take the reorder alert one step further: auto-draft and send the PO to the supplier's ordering email.",
    estBuildHours: 30,
    buildCostEstimate: 2100,
    projectedAnnualSKURevenue: 17000,
  },
  {
    title: "Branded packing slips",
    description:
      "Apply the account's invoice branding to packing slips shipped with every order.",
    estBuildHours: 10,
    buildCostEstimate: 700,
    projectedAnnualSKURevenue: 1400,
  },
  {
    title: "RMA email notifications",
    description:
      "Send the customer an automatic status email at each stage of the returns/RMA workflow.",
    estBuildHours: 16,
    buildCostEstimate: 1100,
    projectedAnnualSKURevenue: 3200,
  },
  {
    title: "Supplier scorecard export to Excel",
    description:
      "Let the ops team export the supplier scorecard to a formatted Excel workbook for board reporting.",
    estBuildHours: 9,
    buildCostEstimate: 650,
    projectedAnnualSKURevenue: 1100,
  },
];

function makeRequest(
  template: RequestTemplate,
  account: Account,
  fromFlywheel: boolean,
): AddonRequest {
  return {
    id: `req-${account.id}-${template.title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    accountId: account.id,
    accountName: account.accountName,
    title: template.title,
    description: template.description,
    estBuildHours: template.estBuildHours,
    buildCostEstimate: template.buildCostEstimate,
    projectedAnnualSKURevenue: template.projectedAnnualSKURevenue,
    state: "RECEIVED",
    createdAt: Date.now(),
    sharedAt: null,
    evaluation: null,
    negotiationRound: 0,
    customerResponse: null,
    finalDecision: null,
    offerAmount: 0,
    build: null,
    sponsorEmail: null,
    processing: false,
    error: null,
    fromFlywheel,
  };
}

export function seedInitialRequests(accounts: Account[]): AddonRequest[] {
  if (accounts.length === 0) return [];
  return SEED_REQUEST_TEMPLATES.map((template, i) =>
    makeRequest(template, accounts[i % accounts.length], false),
  );
}

/** Picks the next follow-up template (cycling through the pool) and the
 * best-matching account for a cross-sell: same account type as the
 * originating account, excluding accounts that already have a request,
 * preferring higher annual revenue. Falls back to any account without an
 * existing request, then to the originating account itself. */
export function pickFlywheelTarget(
  originAccount: Account,
  allAccounts: Account[],
  existingRequests: AddonRequest[],
  followupIndex: number,
): { account: Account; template: RequestTemplate } | null {
  const usedAccountIds = new Set(existingRequests.map((r) => r.accountId));
  const sameType = allAccounts
    .filter((a) => a.id !== originAccount.id)
    .filter((a) => a.accountType === originAccount.accountType)
    .filter((a) => !usedAccountIds.has(a.id))
    .sort((a, b) => b.annualRevenueUSD - a.annualRevenueUSD);

  const fallback = allAccounts
    .filter((a) => a.id !== originAccount.id)
    .filter((a) => !usedAccountIds.has(a.id))
    .sort((a, b) => b.annualRevenueUSD - a.annualRevenueUSD);

  const account = sameType[0] ?? fallback[0] ?? originAccount;
  const template =
    FOLLOWUP_REQUEST_TEMPLATES[followupIndex % FOLLOWUP_REQUEST_TEMPLATES.length];

  return { account, template };
}

export function makeFlywheelRequest(
  template: RequestTemplate,
  account: Account,
): AddonRequest {
  return makeRequest(template, account, true);
}
