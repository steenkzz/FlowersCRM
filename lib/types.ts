export interface Account {
  id: string;
  company: string;
  contactName: string;
  contactRole: string;
  email: string;
  sector: string;
  employees: string;
  region: string;
  currentSoftware: string;
  customerSince: string;
  lastActivity: string;
  annualRevenueEUR: string;
  openOpportunity: string;
  notes: string;
  extra: Record<string, string>;
}

export interface DraftEmail {
  subject: string;
  body: string;
}

export interface EnrichmentResult {
  webFindings: string[];
  aiOpportunityScore: number;
  scoreReasoning: string;
  recommendedAction: string;
  draftEmail: DraftEmail;
}

export type EnrichmentStatus =
  | "idle"
  | "queued"
  | "researching"
  | "done"
  | "error";

export interface EnrichedAccount extends Account {
  status: EnrichmentStatus;
  enrichment: EnrichmentResult | null;
  error: string | null;
}

export interface ActivityEvent {
  id: string;
  accountId: string;
  company: string;
  message: string;
  timestamp: number;
  kind: "start" | "finding" | "done" | "error";
}
