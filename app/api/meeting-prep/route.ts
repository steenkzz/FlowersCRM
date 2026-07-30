import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface MeetingPrepRequestBody {
  accountName: string;
  pipelineKind?: "ecomm" | "innovation";
  opportunityValueUSD?: number;
  tier?: string;
  notes?: string;
  context?: string;
}

interface MeetingPrepResult {
  bullets: string[];
}

function fallbackResult(): MeetingPrepResult {
  return {
    bullets: [
      "Automatic prep failed — review the account's CRM notes manually before the call.",
      "Confirm the opportunity value and pitch angle with the account team beforehand.",
      "Bring a concrete next step to propose if the conversation goes well.",
    ],
  };
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return trimmed;
}

function buildPrompt(body: MeetingPrepRequestBody): string {
  const pitchContext =
    body.pipelineKind === "innovation"
      ? "This meeting is about inviting them into the Innovation Partner program — productizing their custom work history and offering a revenue share."
      : "This meeting is about pitching the new AI-generated e-commerce storefront + 1% commission play.";

  return `You are prepping an account rep for an upcoming meeting.

ACCOUNT: ${body.accountName}
- Pricing tier: ${body.tier || "unknown"}
- Estimated opportunity value (USD): ${body.opportunityValueUSD ?? "unknown"}
- Notes: ${body.notes || "none"}
${body.context ? `- Additional context: ${body.context}` : ""}

${pitchContext}

Write exactly 3 short, concrete prep bullets for the rep — e.g. a talking point grounded in their account data, a likely objection and how to handle it, and a clear ask/next step. No fluff, no generic advice.

Respond with ONLY a single raw JSON object — no markdown code fences, no commentary before or after. Exact shape:
{
  "bullets": [string, string, string]
}`;
}

export async function POST(req: NextRequest) {
  let body: MeetingPrepRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const accountName = body?.accountName?.trim();
  if (!accountName) {
    return NextResponse.json(
      { error: "accountName is required" },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(fallbackResult());
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: buildPrompt(body) }],
    });

    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    const rawText = textBlocks
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!rawText) {
      return NextResponse.json(fallbackResult());
    }

    let parsed: Partial<MeetingPrepResult>;
    try {
      parsed = JSON.parse(stripJsonFences(rawText));
    } catch {
      return NextResponse.json(fallbackResult());
    }

    const bullets = Array.isArray(parsed.bullets)
      ? parsed.bullets.map(String).slice(0, 3)
      : [];

    if (bullets.length === 0) {
      return NextResponse.json(fallbackResult());
    }

    return NextResponse.json({ bullets });
  } catch (err) {
    console.error("meeting-prep failed for", accountName, err);
    return NextResponse.json(fallbackResult());
  }
}
