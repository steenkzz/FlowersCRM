import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  DEFAULT_PRICING_CONFIG,
  projectSeatGrowth,
  resolveTier,
  type PricingConfig,
} from "@/lib/pricing";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ScanRequestBody {
  accountName: string;
  website?: string;
  accountType?: string;
  region?: string;
  annualRevenueUSD?: number;
  revenueGrowthYoY?: number;
  customersOnFile?: number;
  pricingTier?: string;
  notes?: string;
  pricingConfig?: PricingConfig;
}

interface ScanResult {
  hasOnlineStore: boolean;
  confidence: "high" | "medium" | "low";
  evidence: string[];
  estOnlineGMV: number;
  commissionRevenueForUs: number;
  projectedNewSeats: number;
  pitchAngle: string;
  draftEmail: { subject: string; body: string };
}

const COMMISSION_RATE = 0.01;

function computeDerivedFields(
  estOnlineGMV: number,
  body: ScanRequestBody,
): { commissionRevenueForUs: number; projectedNewSeats: number } {
  const gmv = Number.isFinite(estOnlineGMV) ? Math.max(0, estOnlineGMV) : 0;
  const pricingConfig = body.pricingConfig ?? DEFAULT_PRICING_CONFIG;
  const tier = resolveTier(
    body.pricingTier ?? "",
    body.annualRevenueUSD ?? 0,
    pricingConfig,
  );
  const { extraSeats } = projectSeatGrowth(
    tier,
    body.revenueGrowthYoY ?? 0,
    pricingConfig,
  );
  return {
    commissionRevenueForUs: Math.round(gmv * COMMISSION_RATE),
    projectedNewSeats: Math.round(extraSeats),
  };
}

function fallbackResult(body: ScanRequestBody, reason: string): ScanResult {
  const { commissionRevenueForUs, projectedNewSeats } = computeDerivedFields(
    0,
    body,
  );
  return {
    hasOnlineStore: false,
    confidence: "low",
    evidence: [`Scan failed (${reason}) — review this account manually.`],
    estOnlineGMV: 0,
    commissionRevenueForUs,
    projectedNewSeats,
    pitchAngle: "Manual review needed — automatic scan could not complete.",
    draftEmail: {
      subject: `Quick idea for ${body.accountName}`,
      body: "We couldn't generate a personalized draft for this account automatically. Please write one manually.",
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

function buildPrompt(body: ScanRequestBody): string {
  return `You are a growth-intelligence analyst for a company that sells ERP software to retail/commerce businesses. The company's new play: launch a near-free AI-generated e-commerce storefront for existing ERP customers and take a 1% commission on their online sales.

Your job: research whether this specific account already sells online, and if not (or if their online presence looks weak), size the opportunity.

ACCOUNT:
- Name: ${body.accountName}
- Website: ${body.website || "unknown — search for it by name"}
- Account type: ${body.accountType || "unknown"}
- Region: ${body.region || "unknown"}
- Annual revenue (USD): ${body.annualRevenueUSD ?? "unknown"}
- Revenue growth YoY (%): ${body.revenueGrowthYoY ?? "unknown"}
- Customers on file: ${body.customersOnFile ?? "unknown"}
- Notes: ${body.notes || "none"}

INSTRUCTIONS:
1. Use web search to visit the account's website (or find it by name if no URL given). Look specifically for: a checkout/cart flow, "shop" or "buy now" navigation, product listing pages, or a platform fingerprint (Shopify, WooCommerce, BigCommerce, etc.). If the site is unreachable or the company is too small/private to find, say so plainly in evidence and lower your confidence — don't guess.
2. Decide hasOnlineStore (true/false) and a confidence level for that call.
3. Estimate estOnlineGMV — their plausible ANNUAL online sales volume in USD if they had (or already have) a solid storefront. Reason from their annual revenue, account type (e.g. retail typically converts a higher share of revenue online than wholesale/enterprise-service accounts), and whatever you found on the web. Be conservative and realistic, not maximal — this number will be multiplied by 1% to estimate our commission revenue, so it should hold up to scrutiny.
4. Write a one-sentence pitchAngle — the single sharpest reason this account is a good target for the storefront + commission pitch right now.
5. Draft a short, specific, personalized outreach email (not generic boilerplate) — reference something real from the CRM notes or your web research, and frame the storefront as low-effort/low-risk for them (near-free to launch, we only make money when they do).

Respond with ONLY a single raw JSON object — no markdown code fences, no commentary before or after. Exact shape (you do not need to compute commissionRevenueForUs or projectedNewSeats — leave them as 0, the caller derives them):
{
  "hasOnlineStore": boolean,
  "confidence": "high" | "medium" | "low",
  "evidence": string[],
  "estOnlineGMV": number,
  "commissionRevenueForUs": 0,
  "projectedNewSeats": 0,
  "pitchAngle": string,
  "draftEmail": { "subject": string, "body": string }
}`;
}

export async function POST(req: NextRequest) {
  let body: ScanRequestBody;
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
      fallbackResult(body, "no API key configured"),
    );
  }

  const tools = [
    { type: "web_search_20250305" as const, name: "web_search" as const },
  ];

  try {
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: buildPrompt(body) },
    ];

    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      tools,
      messages,
    });

    let guard = 0;
    while (response.stop_reason === "pause_turn" && guard < 3) {
      messages.push({ role: "assistant", content: response.content });
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        tools,
        messages,
      });
      guard += 1;
    }

    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    const rawText = textBlocks
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!rawText) {
      return NextResponse.json(fallbackResult(body, "empty model response"));
    }

    let parsed: Partial<ScanResult> & {
      draftEmail?: Partial<ScanResult["draftEmail"]>;
    };
    try {
      parsed = JSON.parse(stripJsonFences(rawText));
    } catch {
      return NextResponse.json(fallbackResult(body, "unparseable JSON"));
    }

    const estOnlineGMV =
      typeof parsed.estOnlineGMV === "number" &&
      Number.isFinite(parsed.estOnlineGMV)
        ? Math.max(0, parsed.estOnlineGMV)
        : 0;
    const { commissionRevenueForUs, projectedNewSeats } = computeDerivedFields(
      estOnlineGMV,
      body,
    );

    const result: ScanResult = {
      hasOnlineStore: parsed.hasOnlineStore === true,
      confidence:
        parsed.confidence === "high" ||
        parsed.confidence === "medium" ||
        parsed.confidence === "low"
          ? parsed.confidence
          : "low",
      evidence: Array.isArray(parsed.evidence)
        ? parsed.evidence.map(String).slice(0, 8)
        : [],
      estOnlineGMV,
      commissionRevenueForUs,
      projectedNewSeats,
      pitchAngle:
        typeof parsed.pitchAngle === "string" ? parsed.pitchAngle : "",
      draftEmail: {
        subject:
          typeof parsed.draftEmail?.subject === "string"
            ? parsed.draftEmail.subject
            : `Quick idea for ${accountName}`,
        body:
          typeof parsed.draftEmail?.body === "string"
            ? parsed.draftEmail.body
            : "",
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("ecomm-scan failed for", accountName, err);
    return NextResponse.json(fallbackResult(body, "processing error"));
  }
}
