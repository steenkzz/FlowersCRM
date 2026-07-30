import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface SimulateCustomerRequestBody {
  accountName: string;
  paymentStatus?: string;
  npsScore?: number;
  notes?: string;
  addonTitle: string;
  offerType: "quote" | "free";
  offerAmount: number;
  isFinalRound: boolean;
}

interface DraftEmail {
  subject: string;
  body: string;
}

interface CustomerResponseResult {
  decision: "agree" | "decline" | "negotiate";
  replyEmail: DraftEmail;
}

function fallbackResult(body: SimulateCustomerRequestBody): CustomerResponseResult {
  return {
    decision: "agree",
    replyEmail: {
      subject: `Re: ${body.addonTitle}`,
      body: "Sounds good, let's move forward. (Automatic reply generation failed — this is a fallback.)",
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

function buildPrompt(body: SimulateCustomerRequestBody): string {
  const offerLine =
    body.offerType === "free"
      ? "The vendor is offering to build this for FREE, in exchange for the vendor capturing marketplace SKU rights and the account getting a revenue share whenever other customers adopt it."
      : `The vendor is quoting $${body.offerAmount} to build this.`;

  return `Role-play as the customer account below, responding to a vendor's offer for a custom ERP add-on. Stay fully in character — react the way THIS account plausibly would, given their own account health signals.

ACCOUNT: ${body.accountName}
- Payment status: ${body.paymentStatus || "unknown"}
- NPS score: ${body.npsScore ?? "unknown"}
- Notes on file: ${body.notes || "none"}

REQUESTED ADD-ON: ${body.addonTitle}
OFFER: ${offerLine}

${
  body.isFinalRound
    ? "This is the FINAL round — you already tried to negotiate once and the vendor gave you their best final number. You must decide \"agree\" or \"decline\" now. Do not ask for further negotiation."
    : 'You may "agree", "decline", or "negotiate" (ask for a discount) if that fits the account\'s profile — e.g. an account with overdue payment status or a low NPS score is more likely to push back or decline; a happy, current-paying account is more likely to agree readily.'
}

Write a short, in-character reply email as this account's contact would send it.

Respond with ONLY a single raw JSON object — no markdown code fences, no commentary before or after. Exact shape:
{
  "decision": "${body.isFinalRound ? "agree" : "agree"}" | "decline"${body.isFinalRound ? "" : ' | "negotiate"'},
  "replyEmail": { "subject": string, "body": string }
}`;
}

export async function POST(req: NextRequest) {
  let body: SimulateCustomerRequestBody;
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
    return NextResponse.json(fallbackResult(body));
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
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
      return NextResponse.json(fallbackResult(body));
    }

    let parsed: {
      decision?: string;
      replyEmail?: Partial<DraftEmail>;
    };
    try {
      parsed = JSON.parse(stripJsonFences(rawText));
    } catch {
      return NextResponse.json(fallbackResult(body));
    }

    let decision: CustomerResponseResult["decision"] =
      parsed.decision === "agree" ||
      parsed.decision === "decline" ||
      parsed.decision === "negotiate"
        ? parsed.decision
        : "agree";

    // Safety: the model must not negotiate past the final round.
    if (body.isFinalRound && decision === "negotiate") {
      decision = "decline";
    }

    const result: CustomerResponseResult = {
      decision,
      replyEmail: {
        subject:
          typeof parsed.replyEmail?.subject === "string"
            ? parsed.replyEmail.subject
            : `Re: ${body.addonTitle}`,
        body:
          typeof parsed.replyEmail?.body === "string"
            ? parsed.replyEmail.body
            : "",
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("simulate-customer failed for", accountName, err);
    return NextResponse.json(fallbackResult(body));
  }
}
