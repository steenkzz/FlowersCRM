"use client";

import { useState } from "react";
import type { Account, CacheEntry, EcommScanResult } from "@/lib/types";
import { formatUSD } from "@/lib/format";

interface FunnelRowProps {
  account: Account;
  entry: CacheEntry<EcommScanResult> | undefined;
  maxCommission: number;
  rank: number;
}

const CONFIDENCE_STYLES: Record<EcommScanResult["confidence"], string> = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-500 border-slate-200",
};

export default function FunnelRow({
  account,
  entry,
  maxCommission,
  rank,
}: FunnelRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isDone = entry?.status === "done";
  const data = isDone ? entry.data : null;
  const barWidth =
    data && maxCommission > 0
      ? Math.max(4, Math.round((data.commissionRevenueForUs / maxCommission) * 100))
      : 0;

  async function handleCopy() {
    if (!data) return;
    const text = `Subject: ${data.draftEmail.subject}\n\n${data.draftEmail.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — button just won't confirm
    }
  }

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => isDone && setExpanded((v) => !v)}
        disabled={!isDone}
        className={`flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors ${
          isDone ? "cursor-pointer hover:bg-slate-50" : "cursor-default"
        }`}
      >
        <span className="w-5 shrink-0 text-xs font-medium text-slate-300 tabular-nums">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-slate-900">
              {account.accountName}
            </span>
            {data && (
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${CONFIDENCE_STYLES[data.confidence]}`}
              >
                {data.confidence} confidence
              </span>
            )}
            {data && (
              <span className="shrink-0 text-[11px] text-slate-400">
                {data.hasOnlineStore ? "already online" : "no store found"}
              </span>
            )}
            {entry?.status === "loading" && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-indigo">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-indigo" />
                scanning…
              </span>
            )}
            {entry?.status === "error" && (
              <span className="text-xs font-medium text-red-500">
                scan failed
              </span>
            )}
          </div>
          {data ? (
            <div className="mt-1.5 h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo transition-all duration-500"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          ) : (
            <p className="truncate text-sm text-slate-400">
              {entry?.status === "error"
                ? "Showing a $0 fallback estimate — retry from the scan button above."
                : account.website || "No website on file"}
            </p>
          )}
        </div>
        <div className="w-28 shrink-0 text-right">
          <span className="font-semibold tabular-nums text-slate-900">
            {data ? formatUSD(data.commissionRevenueForUs) : "—"}
          </span>
          <p className="text-[11px] text-slate-400">commission/yr</p>
        </div>
      </button>

      {expanded && data && (
        <div className="animate-fade-in-up grid grid-cols-1 gap-6 border-t border-slate-100 bg-slate-50 px-4 py-5 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pitch angle
              </h4>
              <p className="text-sm text-slate-700">{data.pitchAngle}</p>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Evidence
              </h4>
              {data.evidence.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {data.evidence.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No evidence recorded.</p>
              )}
            </div>
            <div className="flex gap-6">
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Est. online GMV
                </h4>
                <p className="text-sm font-semibold text-slate-900">
                  {formatUSD(data.estOnlineGMV)}
                </p>
              </div>
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Projected new seats
                </h4>
                <p className="text-sm font-semibold text-slate-900">
                  {data.projectedNewSeats}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Draft email
              </h4>
              <button
                onClick={handleCopy}
                className="rounded-md bg-indigo px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo/90"
              >
                {copied ? "Copied ✓" : "Copy email"}
              </button>
            </div>
            <p className="mb-2 text-sm font-semibold text-slate-900">
              {data.draftEmail.subject}
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {data.draftEmail.body}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
