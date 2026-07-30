import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SCORE_THRESHOLD = 55;

interface EvaluateRequestBody {
  title: string;
  description: string;
  estBuildHours: number;
  buildCostEstimate: number;
  projectedAnnualSKURevenue: number;
  accountName: string;
  accountType?: string;
  paymentStatus?: string;
  npsScore?: number;
  notes?: string;
  customExclusiveRate: number;
  customRoadmapRate: number;
}

interface DraftEmail {
  subject: string;
  body: string;
}

interface EvaluationResult {
  score: number;
  decision: "reject" | "quote" | "free";
  reasoning: string;
  quoteAmount: number;
  offerEmail: DraftEmail;
}

function fallbackResult(
  body: EvaluateRequestBody,
  quoteAmount: number,
  isFreeEligible: boolean,
): EvaluationResult {
  const score = SCORE_THRESHOLD;
  const decision: EvaluationResult["decision"] = isFreeEligible ? "free" : "quote";
  return {
    score,
    decision,
    reasoning:
      "Automatic evaluation failed — defaulted to a standard offer so the account isn't left waiting. Review manually.",
    quoteAmount: decision === "quote" ? quoteAmount : 0,
    offerEmail: {
      subject: `Re: ${body.title} for ${body.accountName}`,
      body:
        decision === "free"
          ? "We couldn't generate a personalized offer automatically. Based on the projected marketplace value, this looks like a strong candidate for a free build with revenue share — please follow up manually."
          : "We couldn't generate a personalized quote automatically. Please follow up manually.",
    },
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

function buildPrompt(
  body: EvaluateRequestBody,
  quoteAmount: number,
  isFreeEligible: boolean,
): string {
  return `You are the Decision Agent for an ERP vendor's Add-On Marketplace. A customer account has requested a custom add-on. Evaluate it, then draft outreach for every possible outcome so the caller can pick the right one deterministically.

REQUEST: ${body.title}
Description: ${body.description}
Estimated build hours: ${body.estBuildHours}
Our internal build cost estimate (USD): ${body.buildCostEstimate}
Projected annual marketplace SKU revenue if this becomes a reusable add-on (USD): ${body.projectedAnnualSKURevenue}

ACCOUNT: ${body.accountName}
- Type: ${body.accountType || "unknown"}
- Payment status: ${body.paymentStatus || "unknown"}
- NPS score: ${body.npsScore ?? "unknown"}
- Notes: ${body.notes || "none"}

PRICING CONTEXT (already computed — use exactly these numbers, do not recompute):
- If we quote this request, the quote amount is $${quoteAmount} (roadmap rate × build hours).
- Whether this request is eligible for a FREE build (because projected SKU revenue clears 3x our build cost) has already been determined: ${isFreeEligible ? "YES, it is free-eligible" : "NO, it is not free-eligible"}.
- If declined, the alternative to pitch is our exclusive custom-build lane at $${body.customExclusiveRate}/hr (a paid, dedicated-engineering lane, separate from the free marketplace path).

INSTRUCTIONS:
1. Score this request 0-100 on qualification: technical feasibility, strategic fit with the marketplace, and account health (payment status, NPS, tone of notes). A score below ${SCORE_THRESHOLD} means we will not build it right now.
2. Explain your score in 2-3 sentences.
3. Draft THREE separate emails, one for each possible outcome — the caller will pick exactly one based on the deterministic rule (score vs ${SCORE_THRESHOLD}, and the free-eligibility flag above), so all three must be complete and ready to send:
   - rejectEmail: a respectful decline explaining briefly why (reference your reasoning), offering the exclusive custom-build lane at the rate given above as a paid alternative.
   - quoteEmail: an offer to build this for $${quoteAmount}, framed around the value it unlocks for them.
   - freeOfferEmail: an offer to build this for FREE — explain that we're capturing the marketplace SKU value, and they get a revenue share whenever other customers adopt it too.

Respond with ONLY a single raw JSON object — no markdown code fences, no commentary before or after. Exact shape:
{
  "score": number,
  "reasoning": string,
  "rejectEmail": { "subject": string, "body": string },
  "quoteEmail": { "subject": string, "body": string },
  "freeOfferEmail": { "subject": string, "body": string }
}`;
}

export async function POST(req: NextRequest) {
  let body: EvaluateRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body?.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const quoteAmount = Math.round(
    (body.customRoadmapRate || 0) * (body.estBuildHours || 0),
  );
  const isFreeEligible =
    (body.projectedAnnualSKURevenue || 0) >
    3 * (body.buildCostEstimate || 0);

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(fallbackResult(body, quoteAmount, isFreeEligible));
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        { role: "user", content: buildPrompt(body, quoteAmount, isFreeEligible) },
      ],
    });

    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    const rawText = textBlocks
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!rawText) {
      return NextResponse.json(fallbackResult(body, quoteAmount, isFreeEligible));
    }

    let parsed: {
      score?: number;
      reasoning?: string;
      rejectEmail?: Partial<DraftEmail>;
      quoteEmail?: Partial<DraftEmail>;
      freeOfferEmail?: Partial<DraftEmail>;
    };
    try {
      parsed = JSON.parse(stripJsonFences(rawText));
    } catch {
      return NextResponse.json(fallbackResult(body, quoteAmount, isFreeEligible));
    }

    const score =
      typeof parsed.score === "number" && Number.isFinite(parsed.score)
        ? Math.max(0, Math.min(100, Math.round(parsed.score)))
        : 0;

    const decision: EvaluationResult["decision"] =
      score < SCORE_THRESHOLD ? "reject" : isFreeEligible ? "free" : "quote";

    const emailSource =
      decision === "reject"
        ? parsed.rejectEmail
        : decision === "free"
          ? parsed.freeOfferEmail
          : parsed.quoteEmail;

    const offerEmail: DraftEmail = {
      subject:
        typeof emailSource?.subject === "string"
          ? emailSource.subject
          : `Re: ${title} for ${body.accountName}`,
      body:
        typeof emailSource?.body === "string"
          ? emailSource.body
          : "We couldn't generate a personalized message automatically.",
    };

    const result: EvaluationResult = {
      score,
      decision,
      reasoning:
        typeof parsed.reasoning === "string" ? parsed.reasoning : "",
      quoteAmount: decision === "quote" ? quoteAmount : 0,
      offerEmail,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("evaluate-request failed for", title, err);
    return NextResponse.json(fallbackResult(body, quoteAmount, isFreeEligible));
  }
}
