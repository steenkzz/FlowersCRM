"use client";

import { useMemo, useState } from "react";
import { formatUSD } from "@/lib/format";
import { fetchInvite } from "@/lib/invite";
import type { Account, CacheEntry, DraftEmail, InviteCache } from "@/lib/types";

interface InnovationPartnersTabProps {
  accounts: Account[];
  cache: InviteCache;
  onUpdateCache: (accountId: string, entry: CacheEntry<DraftEmail>) => void;
}

const TOP_N = 10;

export default function InnovationPartnersTab({
  accounts,
  cache,
  onUpdateCache,
}: InnovationPartnersTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const topCandidates = useMemo(
    () =>
      [...accounts]
        .filter((a) => a.avgCustomWorkValueUSD > 0)
        .sort((a, b) => b.avgCustomWorkValueUSD - a.avgCustomWorkValueUSD)
        .slice(0, TOP_N),
    [accounts],
  );

  async function draftInvite(account: Account) {
    onUpdateCache(account.id, { status: "loading" });
    try {
      const data = await fetchInvite(account);
      onUpdateCache(account.id, { status: "done", data });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      onUpdateCache(account.id, { status: "error", message });
    }
  }

  async function copyEmail(id: string, subject: string, body: string) {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // clipboard unavailable — button just won't confirm
    }
  }

  if (accounts.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Innovation partners
        </h2>
        <p className="text-sm text-slate-500">
          Top {TOP_N} accounts by average yearly custom work value —
          candidates to invite into the program.
        </p>
      </div>

      {topCandidates.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No accounts with custom work value on file.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          {topCandidates.map((account, i) => {
            const entry = cache[account.id];
            return (
              <div
                key={account.id}
                className="border-b border-slate-100 px-4 py-4 last:border-0"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <span className="w-5 shrink-0 text-xs font-medium text-slate-300 tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">
                      {account.accountName}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {account.contactName || "No contact"}
                      {account.contactRole ? ` · ${account.contactRole}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums text-slate-900">
                      {formatUSD(account.avgCustomWorkValueUSD)}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      avg custom work / yr
                    </p>
                  </div>
                  <button
                    onClick={() => draftInvite(account)}
                    disabled={entry?.status === "loading"}
                    className="shrink-0 rounded-lg bg-indigo px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo/90 disabled:opacity-50"
                  >
                    {entry?.status === "loading"
                      ? "Drafting…"
                      : entry?.status === "done"
                        ? "Redraft invitation"
                        : "Draft invitation"}
                  </button>
                </div>

                {entry?.status === "error" && (
                  <p className="mt-3 text-sm text-red-500">
                    Couldn&apos;t draft an invitation ({entry.message}).
                  </p>
                )}

                {entry?.status === "done" && (
                  <div className="animate-fade-in-up mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">
                        {entry.data.subject}
                      </p>
                      <button
                        onClick={() =>
                          copyEmail(account.id, entry.data.subject, entry.data.body)
                        }
                        className="shrink-0 rounded-md bg-indigo px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo/90"
                      >
                        {copiedId === account.id ? "Copied ✓" : "Copy email"}
                      </button>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-slate-700">
                      {entry.data.body}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
