import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface BuildAddonRequestBody {
  title: string;
  description: string;
  accountName: string;
  notes?: string;
}

interface BuildResult {
  code: string;
  releaseNote: string;
}

const FALLBACK_CODE = `function AddonPreview() {
  return React.createElement(
    "div",
    { style: { padding: 24, fontFamily: "sans-serif", color: "#475569" } },
    React.createElement("p", null, "Live preview unavailable — the build agent couldn't generate this one. Try again from the request card.")
  );
}`;

function fallbackResult(body: BuildAddonRequestBody): BuildResult {
  return {
    code: FALLBACK_CODE,
    releaseNote: `Automatic build failed for "${body.title}". Please retry — no code was generated.`,
  };
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:jsx|tsx|js|javascript)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function buildPrompt(body: BuildAddonRequestBody): string {
  return `You are the Build Agent for an ERP vendor's Add-On Marketplace. Generate a single self-contained React component that is a FUNCTIONAL, INTERACTIVE demo of the requested add-on — not a static mockup. A person should be able to click things and see it respond.

ADD-ON REQUESTED: ${body.title}
Description: ${body.description}
Requested by: ${body.accountName}
Context notes: ${body.notes || "none"}

STRICT TECHNICAL CONTRACT (the code will be transpiled and executed directly in a browser — follow this exactly or it will fail to render):
- Define exactly one component function named "AddonPreview" — no more, no less.
- Do NOT write any "import" or "export" statements. React is already available as a global named "React" (you may destructure hooks from it, e.g. "const { useState } = React;").
- Do NOT reference any library other than React. No fetch/network calls.
- Use ONLY inline style objects (style={{ ... }}) for styling — no className, no external CSS, no Tailwind.
- Wire the mock data to plausible ERP field names for this domain (e.g. sku, quantityOnHand, reorderPoint, customerId, orderTotal — whatever fits the specific add-on), and hardcode a small realistic dataset (3-8 rows/items) directly in the component.
- Include at least one piece of real interactivity via useState (a button, a filter, a toggle, an input) — not just static rendered output.
- The component takes no required props and must render standalone as <AddonPreview />.
- Keep it under ~150 lines. Use a clean, modern visual style (rounded corners, subtle borders, a simple color accent) via inline styles.

Also write releaseNote: one paragraph, written like a product changelog entry announcing this add-on shipping.

Respond with ONLY a single raw JSON object — no markdown code fences around the JSON itself, no commentary before or after. The "code" field's value should be a JSON string containing the raw component source (escaped as needed) — not further wrapped in markdown fences. Exact shape:
{
  "code": string,
  "releaseNote": string
}`;
}

export async function POST(req: NextRequest) {
  let body: BuildAddonRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body?.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(fallbackResult(body));
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
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

    let parsed: { code?: string; releaseNote?: string };
    const trimmed = rawText.trim();
    const fencedJson = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonCandidate = fencedJson ? fencedJson[1].trim() : trimmed;
    try {
      parsed = JSON.parse(jsonCandidate);
    } catch {
      // Some models wrap the whole thing in code fences even though we
      // asked for raw JSON, or emit the component code directly. Try to
      // salvage a component definition from the raw text as a last resort.
      const codeOnly = stripCodeFences(rawText);
      if (codeOnly.includes("AddonPreview")) {
        return NextResponse.json({
          code: codeOnly,
          releaseNote: `${title} is now available in the Add-On Library.`,
        });
      }
      return NextResponse.json(fallbackResult(body));
    }

    const code =
      typeof parsed.code === "string" && parsed.code.includes("AddonPreview")
        ? parsed.code
        : FALLBACK_CODE;
    const releaseNote =
      typeof parsed.releaseNote === "string"
        ? parsed.releaseNote
        : `${title} is now available in the Add-On Library.`;

    return NextResponse.json({ code, releaseNote });
  } catch (err) {
    console.error("build-addon failed for", title, err);
    return NextResponse.json(fallbackResult(body));
  }
}
