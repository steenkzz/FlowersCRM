import type {
  Account,
  ActivityEvent,
  CacheEntry,
  EcommScanResult,
} from "./types";
import { formatUSD } from "./format";

function truncate(text: string, max = 90): string {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

interface RunScansOptions {
  concurrency?: number;
  onUpdate: (accountId: string, entry: CacheEntry<EcommScanResult>) => void;
  onActivity: (event: Omit<ActivityEvent, "id" | "timestamp">) => void;
}

async function scanOne(
  account: Account,
  { onUpdate, onActivity }: RunScansOptions,
): Promise<void> {
  onUpdate(account.id, { status: "loading" });
  onActivity({
    accountId: account.id,
    accountName: account.accountName,
    message: `Visiting ${account.website || "their site"}…`,
    kind: "start",
  });

  try {
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
        notes: account.notes,
      }),
    });

    if (!res.ok) throw new Error(`API returned ${res.status}`);

    const data: EcommScanResult = await res.json();

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
