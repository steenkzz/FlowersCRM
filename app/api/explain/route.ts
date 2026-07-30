import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ExplainRequestBody {
  accountName: string;
  accountType?: string;
  region?: string;
  score?: number;
  annualRevenueUSD?: number;
  customersOnFile?: number;
  valPayGMVUSD?: number;
  revenueGrowthYoY?: number;
  avgCustomWorkValueUSD?: number;
  avgSupportValueUSD?: number;
  notes?: string;
}

interface ExplainResult {
  explanation: string;
  nextAction: string;
}

function fallbackResult(accountName: string, reason: string): ExplainResult {
  return {
    explanation: `Automatic explanation failed (${reason}). This account's score is still valid — it's computed deterministically from the metrics — but review the numbers manually for context.`,
    nextAction: "Manual review needed.",
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

function buildPrompt(body: ExplainRequestBody): string {
  return `You are a growth-intelligence analyst for a company that sells ERP software to retail/commerce businesses, now qualifying accounts for a new AI storefront + 1% commission play.

ACCOUNT: ${body.accountName}
- Type: ${body.accountType || "unknown"}
- Region: ${body.region || "unknown"}
- Qualification score (0-100, deterministic, already computed — do not recompute it): ${body.score ?? "unknown"}
- Annual revenue (USD): ${body.annualRevenueUSD ?? "unknown"}
- Customers on file: ${body.customersOnFile ?? "unknown"}
- ValPay GMV (USD): ${body.valPayGMVUSD ?? "unknown"}
- Revenue growth YoY (%): ${body.revenueGrowthYoY ?? "unknown"}
- Avg yearly custom work value (USD): ${body.avgCustomWorkValueUSD ?? "unknown"}
- Avg support value (USD): ${body.avgSupportValueUSD ?? "unknown"}
- Notes: ${body.notes || "none"}

In 2-3 sentences, explain why this account qualifies (or doesn't) — reference the specific metrics that drive it, and anything relevant in Notes. Then give the single best next action for the account team. No web search, no fabricated details — reason only from the data given.

Respond with ONLY a single raw JSON object — no markdown code fences, no commentary before or after. Exact shape:
{
  "explanation": string,
  "nextAction": string
}`;
}

export async function POST(req: NextRequest) {
  let body: ExplainRequestBody;
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
    return NextResponse.json(
      fallbackResult(accountName, "no API key configured"),
    );
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
      return NextResponse.json(fallbackResult(accountName, "empty model response"));
    }

    let parsed: Partial<ExplainResult>;
    try {
      parsed = JSON.parse(stripJsonFences(rawText));
    } catch {
      return NextResponse.json(fallbackResult(accountName, "unparseable JSON"));
    }

    const result: ExplainResult = {
      explanation:
        typeof parsed.explanation === "string" ? parsed.explanation : "",
      nextAction:
        typeof parsed.nextAction === "string" ? parsed.nextAction : "",
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("explain failed for", accountName, err);
    return NextResponse.json(fallbackResult(accountName, "processing error"));
  }
}
