import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface EnrichRequestBody {
  company: string;
  contactName?: string;
  contactRole?: string;
  sector?: string;
  employees?: string;
  region?: string;
  currentSoftware?: string;
  customerSince?: string;
  lastActivity?: string;
  annualRevenueEUR?: string;
  openOpportunity?: string;
  notes?: string;
}

interface EnrichResult {
  webFindings: string[];
  aiOpportunityScore: number;
  scoreReasoning: string;
  recommendedAction: string;
  draftEmail: { subject: string; body: string };
}

function fallbackResult(company: string, reason: string): EnrichResult {
  return {
    webFindings: [],
    aiOpportunityScore: 0,
    scoreReasoning: `Automatic enrichment failed (${reason}). Score defaulted to 0 — review this account manually.`,
    recommendedAction: "Manual review needed — enrichment could not complete.",
    draftEmail: {
      subject: `Following up, ${company}`,
      body: "We couldn't generate a personalized draft for this account automatically. Please write one manually.",
    },
  };
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  // Fall back to grabbing the outermost { ... } block in case of stray prose
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return trimmed;
}

function buildPrompt(body: EnrichRequestBody): string {
  return `You are a B2B sales intelligence analyst. Research this company using web search, then score how likely they are to be a good prospect for an AI/automation product.

CRM RECORD:
- Company: ${body.company}
- Contact: ${body.contactName || "unknown"} (${body.contactRole || "unknown role"})
- Sector: ${body.sector || "unknown"}
- Employees: ${body.employees || "unknown"}
- Region: ${body.region || "unknown"}
- Current software/CRM: ${body.currentSoftware || "unknown"}
- Customer since: ${body.customerSince || "unknown"}
- Last activity: ${body.lastActivity || "unknown"}
- Annual revenue (EUR): ${body.annualRevenueEUR || "unknown"}
- Open opportunity: ${body.openOpportunity || "none"}
- Notes: ${body.notes || "none"}

INSTRUCTIONS:
1. Use web search to find recent, relevant public information about this company: recent news, funding, hiring trends, technology-stack signals, and any public mentions of AI or automation initiatives. If you can't confidently find the company (ambiguous name, too small for a web presence), say so plainly in webFindings and score conservatively rather than guessing.
2. Score "AI opportunity likelihood" 0-100. Combine BOTH the CRM record (especially Notes, Current Software, and Open Opportunity) AND what you found on the web. Higher = strong signal they need/want AI-powered tooling soon (hiring for data/AI roles, outdated current software, public digital-transformation statements, growth signals, an open opportunity already in play, stale current software). Lower = no signal, declining company, or already running a modern AI-native stack that competes with what we'd pitch.
3. Recommend one concrete next action for the sales rep.
4. Draft a short, specific, personalized outreach email (not generic boilerplate) referencing at least one real detail from the CRM record or the web research.

Respond with ONLY a single raw JSON object — no markdown code fences, no commentary before or after. Exact shape:
{
  "webFindings": string[],
  "aiOpportunityScore": number,
  "scoreReasoning": string,
  "recommendedAction": string,
  "draftEmail": { "subject": string, "body": string }
}`;
}

export async function POST(req: NextRequest) {
  let body: EnrichRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const company = body?.company?.trim();
  if (!company) {
    return NextResponse.json(
      { error: "company is required" },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(fallbackResult(company, "no API key configured"));
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
      return NextResponse.json(fallbackResult(company, "empty model response"));
    }

    let parsed: Partial<EnrichResult> & {
      draftEmail?: Partial<EnrichResult["draftEmail"]>;
    };
    try {
      parsed = JSON.parse(stripJsonFences(rawText));
    } catch {
      return NextResponse.json(fallbackResult(company, "unparseable JSON"));
    }

    const result: EnrichResult = {
      webFindings: Array.isArray(parsed.webFindings)
        ? parsed.webFindings.map(String).slice(0, 8)
        : [],
      aiOpportunityScore:
        typeof parsed.aiOpportunityScore === "number" &&
        Number.isFinite(parsed.aiOpportunityScore)
          ? Math.max(0, Math.min(100, Math.round(parsed.aiOpportunityScore)))
          : 0,
      scoreReasoning:
        typeof parsed.scoreReasoning === "string" ? parsed.scoreReasoning : "",
      recommendedAction:
        typeof parsed.recommendedAction === "string"
          ? parsed.recommendedAction
          : "",
      draftEmail: {
        subject:
          typeof parsed.draftEmail?.subject === "string"
            ? parsed.draftEmail.subject
            : `Quick idea for ${company}`,
        body:
          typeof parsed.draftEmail?.body === "string"
            ? parsed.draftEmail.body
            : "",
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("enrich failed for", company, err);
    return NextResponse.json(fallbackResult(company, "processing error"));
  }
}
