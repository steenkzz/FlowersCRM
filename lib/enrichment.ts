import type { Account, ActivityEvent, EnrichedAccount, EnrichmentResult } from "./types";

export function toEnrichedAccount(account: Account): EnrichedAccount {
  return { ...account, status: "idle", enrichment: null, error: null };
}

function truncate(text: string, max = 90): string {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

interface RunEnrichmentOptions {
  concurrency?: number;
  onUpdate: (id: string, patch: Partial<EnrichedAccount>) => void;
  onActivity: (event: Omit<ActivityEvent, "id" | "timestamp">) => void;
}

async function enrichOne(
  account: EnrichedAccount,
  { onUpdate, onActivity }: RunEnrichmentOptions,
): Promise<void> {
  onUpdate(account.id, { status: "researching", error: null });
  onActivity({
    accountId: account.id,
    company: account.company,
    message: "Researching…",
    kind: "start",
  });

  try {
    const res = await fetch("/api/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: account.company,
        website: account.website,
        contactName: account.contactName,
        contactRole: account.contactRole,
        sector: account.sector,
        employees: account.employees,
        annualContractValueUSD: account.annualContractValueUSD,
        contractRenewalDate: account.contractRenewalDate,
        paymentStatus: account.paymentStatus,
        supportTickets12m: account.supportTickets12m,
        npsScore: account.npsScore,
        lastActivity: account.lastActivity,
        currentInternalSoftware: account.currentInternalSoftware,
        openOpportunity: account.openOpportunity,
        notes: account.notes,
      }),
    });

    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }

    const data: EnrichmentResult = await res.json();

    if (data.webFindings.length > 0) {
      onActivity({
        accountId: account.id,
        company: account.company,
        message: `found: ${truncate(data.webFindings[0])}`,
        kind: "finding",
      });
    }

    onUpdate(account.id, { status: "done", enrichment: data, error: null });
    onActivity({
      accountId: account.id,
      company: account.company,
      message: `scored ${data.aiOpportunityScore}/100`,
      kind: "done",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    onUpdate(account.id, { status: "error", error: message });
    onActivity({
      accountId: account.id,
      company: account.company,
      message: "enrichment failed — will show a fallback score",
      kind: "error",
    });
  }
}

export async function runEnrichment(
  accounts: EnrichedAccount[],
  options: RunEnrichmentOptions,
): Promise<void> {
  const concurrency = options.concurrency ?? 4;
  const pending = accounts.filter(
    (a) => a.status === "idle" || a.status === "error",
  );

  for (let i = 0; i < pending.length; i += concurrency) {
    const batch = pending.slice(i, i + concurrency);
    await Promise.all(batch.map((account) => enrichOne(account, options)));
  }
}
