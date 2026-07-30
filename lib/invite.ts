import type { Account, DraftEmail } from "./types";

/** Single-account fetch, no side effects — reused by the Innovation
 * Partners tab and by the Pipeline's "Automated AI Reachout" stage. */
export async function fetchInvite(account: Account): Promise<DraftEmail> {
  const res = await fetch("/api/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accountName: account.accountName,
      contactName: account.contactName,
      contactRole: account.contactRole,
      avgCustomWorkValueUSD: account.avgCustomWorkValueUSD,
      notes: account.notes,
    }),
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}
