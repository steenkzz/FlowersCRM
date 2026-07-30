import type { DraftEmail } from "./types";

export type RequestState =
  | "RECEIVED"
  | "EVALUATED"
  | "REJECTED_REPLIED"
  | "QUOTED"
  | "FREE_OFFERED"
  | "CUSTOMER_AGREED"
  | "CUSTOMER_DECLINED"
  | "BUILDING"
  | "BUILT"
  | "IN_LIBRARY"
  | "SHARED_WITH_SPONSOR";

/** The 8 nodes shown in the loop diagram strip — several fine-grained
 * RequestStates collapse into one node (e.g. the three offer branches). */
export type DiagramNodeId =
  | "received"
  | "evaluated"
  | "offered"
  | "responded"
  | "building"
  | "built"
  | "in_library"
  | "shared";

export const DIAGRAM_NODES: { id: DiagramNodeId; label: string }[] = [
  { id: "received", label: "Received" },
  { id: "evaluated", label: "Evaluated" },
  { id: "offered", label: "Offered" },
  { id: "responded", label: "Customer Responded" },
  { id: "building", label: "Building" },
  { id: "built", label: "Built" },
  { id: "in_library", label: "In Library" },
  { id: "shared", label: "Shared w/ Sponsor" },
];

export const STATE_TO_NODE: Record<RequestState, DiagramNodeId> = {
  RECEIVED: "received",
  EVALUATED: "evaluated",
  REJECTED_REPLIED: "offered",
  QUOTED: "offered",
  FREE_OFFERED: "offered",
  CUSTOMER_AGREED: "responded",
  CUSTOMER_DECLINED: "responded",
  BUILDING: "building",
  BUILT: "built",
  IN_LIBRARY: "in_library",
  SHARED_WITH_SPONSOR: "shared",
};

export interface EvaluationResult {
  score: number;
  decision: "reject" | "quote" | "free";
  reasoning: string;
  quoteAmount: number;
  offerEmail: DraftEmail;
}

export interface CustomerResponseResult {
  decision: "agree" | "decline" | "negotiate";
  replyEmail: DraftEmail;
}

export interface BuildResult {
  code: string;
  releaseNote: string;
}

export interface AddonRequest {
  id: string;
  accountId: string;
  accountName: string;
  title: string;
  description: string;
  estBuildHours: number;
  buildCostEstimate: number;
  projectedAnnualSKURevenue: number;
  state: RequestState;
  createdAt: number;
  sharedAt: number | null;

  evaluation: EvaluationResult | null;
  negotiationRound: number; // 0 = not yet responded, 1 = first response given, 2 = final round used
  customerResponse: CustomerResponseResult | null;
  finalDecision: "agree" | "decline" | null;
  offerAmount: number; // the (possibly discounted) amount actually offered — mirrors evaluation.quoteAmount until negotiated
  build: BuildResult | null;
  sponsorEmail: DraftEmail | null;

  processing: boolean;
  error: string | null;
  fromFlywheel: boolean;
}

export type AutopilotActor =
  | "Decision Agent"
  | "Quote Agent"
  | "Customer (simulated)"
  | "Build Agent"
  | "System";

export interface AutopilotEventDetail {
  kind: "email" | "build";
  subject?: string;
  body?: string;
  releaseNote?: string;
  code?: string;
}

export interface AutopilotEvent {
  id: string;
  timestamp: number;
  actor: AutopilotActor;
  requestId: string;
  accountName: string;
  summary: string;
  detail: AutopilotEventDetail | null;
}

export interface AutopilotStats {
  cyclesCompleted: number;
  addonsShipped: number;
  newARRCaptured: number;
  cycleTimesMs: number[];
}
