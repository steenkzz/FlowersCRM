import type { MeetingPrepResult, PipelineKind } from "./types";

export interface MeetingPrepRequest {
  accountName: string;
  pipelineKind: PipelineKind;
  opportunityValueUSD: number;
  tier: string;
  notes: string;
  context?: string;
}

export async function fetchMeetingPrep(
  req: MeetingPrepRequest,
): Promise<MeetingPrepResult> {
  const res = await fetch("/api/meeting-prep", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}
