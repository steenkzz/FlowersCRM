import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ShareRequestBody {
  addonTitle: string;
  accountName: string;
  releaseNote?: string;
  sponsorSharePct: number;
  projectedAnnualSKURevenue: number;
}

interface DraftEmail {
  subject: string;
  body: string;
}

function fallbackResult(body: ShareRequestBody): DraftEmail {
  return {
    subject: `New Add-On Live: ${body.addonTitle}`,
    body: `${body.addonTitle} (originated by ${body.accountName}) is now live in the Add-On Library. Revenue share terms apply as configured. (Automatic drafting failed — this is a fallback message.)`,
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

function buildPrompt(body: ShareRequestBody): string {
  return `Draft a short notification email to a sponsor account, letting them know a new add-on they inspired is now live in the Add-On Marketplace.

ADD-ON: ${body.addonTitle}
Originating account: ${body.accountName}
Release note: ${body.releaseNote || "none"}
Sponsor revenue share: ${Math.round(body.sponsorSharePct * 100)}% of marketplace revenue from this add-on
Projected annual SKU revenue: $${body.projectedAnnualSKURevenue}

Keep it warm, brief, and concrete about what happens next (they'll see revenue share payouts as other accounts adopt the add-on).

Respond with ONLY a single raw JSON object — no markdown code fences, no commentary before or after. Exact shape:
{
  "subject": string,
  "body": string
}`;
}

export async function POST(req: NextRequest) {
  let body: ShareRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const addonTitle = body?.addonTitle?.trim();
  if (!addonTitle) {
    return NextResponse.json(
      { error: "addonTitle is required" },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(fallbackResult(body));
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
      return NextResponse.json(fallbackResult(body));
    }

    let parsed: Partial<DraftEmail>;
    try {
      parsed = JSON.parse(stripJsonFences(rawText));
    } catch {
      return NextResponse.json(fallbackResult(body));
    }

    const result: DraftEmail = {
      subject:
        typeof parsed.subject === "string"
          ? parsed.subject
          : `New Add-On Live: ${addonTitle}`,
      body: typeof parsed.body === "string" ? parsed.body : "",
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("share-with-sponsor failed for", addonTitle, err);
    return NextResponse.json(fallbackResult(body));
  }
}
