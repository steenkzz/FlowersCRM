export interface Account {
  id: string;
  accountName: string;
  website: string;
  contactName: string;
  contactRole: string;
  email: string;
  accountType: string;
  region: string;
  annualRevenueUSD: number;
  customersOnFile: number;
  valPayGMVUSD: number;
  revenueGrowthYoY: number;
  avgCustomWorkValueUSD: number;
  avgSupportValueUSD: number;
  paymentStatus: string;
  npsScore: number;
  notes: string;
  /** "Business" | "Enterprise" — parsed from the sheet, or derived from
   * revenue vs. pricingConfig.tierGateRevenueMillions when absent. */
  pricingTier: string;
  /** Parsed from "Est. License ARR (USD)", or estimated from pricingConfig
   * (tier base price) when absent/zero. */
  estLicenseARRUSD: number;
  extra: Record<string, string>;
}

export const SCORING_METRICS = [
  { key: "annualRevenueUSD", label: "Annual Revenue" },
  { key: "customersOnFile", label: "Customers On File" },
  { key: "valPayGMVUSD", label: "ValPay GMV" },
  { key: "revenueGrowthYoY", label: "Revenue Growth YoY" },
  { key: "avgCustomWorkValueUSD", label: "Avg Custom Work Value" },
  { key: "avgSupportValueUSD", label: "Avg Support Value" },
] as const;

export type MetricKey = (typeof SCORING_METRICS)[number]["key"];

export type MetricWeights = Record<MetricKey, number>;

export const DEFAULT_WEIGHTS: MetricWeights = {
  annualRevenueUSD: 50,
  customersOnFile: 50,
  valPayGMVUSD: 50,
  revenueGrowthYoY: 50,
  avgCustomWorkValueUSD: 50,
  avgSupportValueUSD: 50,
};

export interface ScoredAccount {
  account: Account;
  score: number;
  normalized: Record<MetricKey, number>;
}

// --- Tab 1: AI explanation ---

export interface ExplanationResult {
  explanation: string;
  nextAction: string;
}

export type CacheEntry<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; data: T };

export type ExplanationCache = Record<string, CacheEntry<ExplanationResult>>;

// --- Tab 2: e-commerce scan ---

export interface DraftEmail {
  subject: string;
  body: string;
}

export interface EcommScanResult {
  hasOnlineStore: boolean;
  confidence: "high" | "medium" | "low";
  evidence: string[];
  estOnlineGMV: number;
  commissionRevenueForUs: number;
  projectedNewSeats: number;
  pitchAngle: string;
  draftEmail: DraftEmail;
}

export type EcommScanCache = Record<string, CacheEntry<EcommScanResult>>;

export interface ActivityEvent {
  id: string;
  accountId: string;
  accountName: string;
  message: string;
  timestamp: number;
  kind: "start" | "finding" | "done" | "error";
}

// --- Tab 3: innovation partner invite ---

export type InviteCache = Record<string, CacheEntry<DraftEmail>>;

// --- Pipeline funnel ---

export type PipelineKind = "ecomm" | "innovation";

export const PIPELINE_STAGES = [
  { id: "identified", label: "Opportunity Identified", probability: 0.1 },
  { id: "reachout", label: "Automated AI Reachout", probability: 0.2 },
  { id: "meeting", label: "Meeting Booked", probability: 0.4 },
  { id: "sent", label: "Opportunity Sent", probability: 0.6 },
  { id: "paid", label: "Paid — In Production", probability: 0.9 },
  { id: "won", label: "Closed Won", probability: 1.0 },
] as const;

export type ColumnStageId = (typeof PIPELINE_STAGES)[number]["id"];
export type StageId = ColumnStageId | "lost";

export type StageMap = Record<string, StageId>;

export interface MeetingPrepResult {
  bullets: string[];
}

export type MeetingPrepCache = Record<string, CacheEntry<MeetingPrepResult>>;
