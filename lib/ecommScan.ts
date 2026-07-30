import type {
  Account,
  ActivityEvent,
  CacheEntry,
  EcommScanResult,
} from "./types";
import type { PricingConfig } from "./pricing";
import { formatUSD } from "./format";

function truncate(text: string, max = 90): string {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/** Single-account fetch, no side effects — reused by the batch scanner
 * below and by the Pipeline's "Automated AI Reachout" stage trigger. */
export async function fetchEcommScan(
  account: Account,
  pricingConfig: PricingConfig,
): Promise<EcommScanResult> {
  const res = await fetch("/api/ecomm-scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accountName: account.accountName,
      website: account.website,
      accountType: account.accountType,
      region: account.region,
      annualRevenueUSD: account.annualRevenueUSD,
      revenueGrowthYoY: account.revenueGrowthYoY,
      customersOnFile: account.customersOnFile,
      pricingTier: account.pricingTier,
      notes: account.notes,
      pricingConfig,
    }),
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

interface RunScansOptions {
  concurrency?: number;
  pricingConfig: PricingConfig;
  onUpdate: (accountId: string, entry: CacheEntry<EcommScanResult>) => void;
  onActivity: (event: Omit<ActivityEvent, "id" | "timestamp">) => void;
}

async function scanOne(
  account: Account,
  { pricingConfig, onUpdate, onActivity }: RunScansOptions,
): Promise<void> {
  onUpdate(account.id, { status: "loading" });
  onActivity({
    accountId: account.id,
    accountName: account.accountName,
    message: `Visiting ${account.website || "their site"}…`,
    kind: "start",
  });

  try {
    const data = await fetchEcommScan(account, pricingConfig);

    if (data.evidence.length > 0) {
      onActivity({
        accountId: account.id,
        accountName: account.accountName,
        message: truncate(data.evidence[0]),
        kind: "finding",
      });
    }

    onUpdate(account.id, { status: "done", data });
    onActivity({
      accountId: account.id,
      accountName: account.accountName,
      message: data.hasOnlineStore
        ? `already online — est. ${formatUSD(data.commissionRevenueForUs)} commission upside`
        : `no online store found — est. ${formatUSD(data.commissionRevenueForUs)} commission opportunity`,
      kind: "done",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    onUpdate(account.id, { status: "error", message });
    onActivity({
      accountId: account.id,
      accountName: account.accountName,
      message: "scan failed — will show a fallback estimate",
      kind: "error",
    });
  }
}

export async function runEcommScans(
  accounts: Account[],
  options: RunScansOptions,
): Promise<void> {
  const concurrency = options.concurrency ?? 4;
  for (let i = 0; i < accounts.length; i += concurrency) {
    const batch = accounts.slice(i, i + concurrency);
    await Promise.all(batch.map((account) => scanOne(account, options)));
  }
}
