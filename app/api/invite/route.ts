import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface InviteRequestBody {
  accountName: string;
  contactName?: string;
  contactRole?: string;
  avgCustomWorkValueUSD?: number;
  notes?: string;
}

interface DraftEmail {
  subject: string;
  body: string;
}

function fallbackResult(accountName: string): DraftEmail {
  return {
    subject: `Invitation: Innovation Partner program for ${accountName}`,
    body: "We couldn't generate a personalized invitation automatically. Please write one manually, referencing their custom work history.",
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

function buildPrompt(body: InviteRequestBody): string {
  return `You are drafting an invitation to our "Innovation Partner" program on behalf of an ERP vendor's account team.

Program pitch: this account has commissioned a lot of custom work from us over time. We want to invite them to become an Innovation Partner — instead of one-off custom work, their best ideas get productized into the core platform (or an official add-on), and they get rewarded with a revenue share whenever other customers adopt something built off their idea.

ACCOUNT: ${body.accountName}
- Contact: ${body.contactName || "unknown"} (${body.contactRole || "unknown role"})
- Avg yearly custom work value (USD): ${body.avgCustomWorkValueUSD ?? "unknown"}
- Notes (custom work history / context): ${body.notes || "none"}

Draft a short, warm, specific invitation email. Reference their actual custom work history from Notes if there's anything concrete there — don't invent details that aren't implied by the notes. Make the ask clear: would they be interested in a call to discuss the Innovation Partner program.

Respond with ONLY a single raw JSON object — no markdown code fences, no commentary before or after. Exact shape:
{
  "subject": string,
  "body": string
}`;
}

export async function POST(req: NextRequest) {
  let body: InviteRequestBody;
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
    return NextResponse.json(fallbackResult(accountName));
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
      return NextResponse.json(fallbackResult(accountName));
    }

    let parsed: Partial<DraftEmail>;
    try {
      parsed = JSON.parse(stripJsonFences(rawText));
    } catch {
      return NextResponse.json(fallbackResult(accountName));
    }

    const result: DraftEmail = {
      subject:
        typeof parsed.subject === "string"
          ? parsed.subject
          : `Invitation: Innovation Partner program for ${accountName}`,
      body: typeof parsed.body === "string" ? parsed.body : "",
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("invite failed for", accountName, err);
    return NextResponse.json(fallbackResult(accountName));
  }
}
