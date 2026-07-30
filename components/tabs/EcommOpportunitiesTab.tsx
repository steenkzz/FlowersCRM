"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import RevenueCounter from "@/components/RevenueCounter";
import ActivityFeed from "@/components/ActivityFeed";
import FunnelRow from "@/components/FunnelRow";
import { runEcommScans } from "@/lib/ecommScan";
import type { PricingConfig } from "@/lib/pricing";
import type {
  Account,
  ActivityEvent,
  CacheEntry,
  EcommScanCache,
  EcommScanResult,
} from "@/lib/types";

interface EcommOpportunitiesTabProps {
  accounts: Account[];
  pricingConfig: PricingConfig;
  cache: EcommScanCache;
  onUpdateCache: (accountId: string, entry: CacheEntry<EcommScanResult>) => void;
}

const TOP_N = 20;

function generateEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function EcommOpportunitiesTab({
  accounts,
  pricingConfig,
  cache,
  onUpdateCache,
}: EcommOpportunitiesTabProps) {
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(accounts[0]?.id ?? "");
  const runIdRef = useRef(0);

  const pushActivity = useCallback(
    (event: Omit<ActivityEvent, "id" | "timestamp">) => {
      setActivity((prev) => [
        ...prev,
        { ...event, id: generateEventId(), timestamp: Date.now() },
      ]);
    },
    [],
  );

  const runScan = useCallback(
    async (targets: Account[]) => {
      const myRun = ++runIdRef.current;
      setIsScanning(true);
      try {
        await runEcommScans(targets, {
          concurrency: 4,
          pricingConfig,
          onUpdate: (id, entry) => {
            if (runIdRef.current === myRun) onUpdateCache(id, entry);
          },
          onActivity: (event) => {
            if (runIdRef.current === myRun) pushActivity(event);
          },
        });
      } finally {
        if (runIdRef.current === myRun) setIsScanning(false);
      }
    },
    [pricingConfig, onUpdateCache, pushActivity],
  );

  const topByRevenue = useMemo(
    () =>
      [...accounts]
        .sort((a, b) => b.annualRevenueUSD - a.annualRevenueUSD)
        .slice(0, TOP_N),
    [accounts],
  );

  const scannedAccounts = useMemo(
    () => accounts.filter((a) => cache[a.id]),
    [accounts, cache],
  );

  const totalCommission = useMemo(
    () =>
      Object.values(cache).reduce(
        (sum, entry) =>
          sum + (entry.status === "done" ? entry.data.commissionRevenueForUs : 0),
        0,
      ),
    [cache],
  );

  const totalSeats = useMemo(
    () =>
      Object.values(cache).reduce(
        (sum, entry) =>
          sum + (entry.status === "done" ? entry.data.projectedNewSeats : 0),
        0,
      ),
    [cache],
  );

  const maxCommission = useMemo(
    () =>
      Math.max(
        1,
        ...Object.values(cache).map((e) =>
          e.status === "done" ? e.data.commissionRevenueForUs : 0,
        ),
      ),
    [cache],
  );

  const rankedScanned = useMemo(() => {
    return [...scannedAccounts].sort((a, b) => {
      const ea = cache[a.id];
      const eb = cache[b.id];
      const va = ea?.status === "done" ? ea.data.commissionRevenueForUs : -1;
      const vb = eb?.status === "done" ? eb.data.commissionRevenueForUs : -1;
      return vb - va;
    });
  }, [scannedAccounts, cache]);

  if (accounts.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            E-commerce opportunities
          </h2>
          <p className="max-w-md text-sm text-slate-500">
            Agents visit each account&apos;s website, check whether they
            already sell online, and size the 1% commission opportunity.
          </p>
        </div>
        <RevenueCounter
          value={totalCommission}
          label="New revenue unlocked"
          sub={`${totalSeats} projected new seats · ${scannedAccounts.length}/${accounts.length} scanned`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.accountName}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            const account = accounts.find((a) => a.id === selectedId);
            if (account) runScan([account]);
          }}
          disabled={isScanning}
          className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Scan this account
        </button>
        <button
          onClick={() => runScan(topByRevenue)}
          disabled={isScanning}
          className="rounded-lg bg-indigo px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo/90 disabled:opacity-50"
        >
          Scan top {Math.min(TOP_N, accounts.length)} by revenue →
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {rankedScanned.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No scans yet — pick an account or scan the top {TOP_N} by revenue.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {rankedScanned.map((account, i) => (
              <FunnelRow
                key={account.id}
                account={account}
                entry={cache[account.id]}
                maxCommission={maxCommission}
                rank={i + 1}
              />
            ))}
          </div>
        )}
        <ActivityFeed events={activity} isRunning={isScanning} />
      </div>
    </div>
  );
}
