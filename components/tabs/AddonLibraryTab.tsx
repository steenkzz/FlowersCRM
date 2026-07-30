"use client";

import { useMemo } from "react";
import RevenueCounter from "@/components/RevenueCounter";
import FlowerIcon from "@/components/FlowerIcon";
import { formatUSD } from "@/lib/format";
import type { AddonRequest } from "@/lib/autopilotTypes";

interface AddonLibraryTabProps {
  requests: AddonRequest[];
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AddonLibraryTab({ requests }: AddonLibraryTabProps) {
  const libraryItems = useMemo(
    () =>
      requests
        .filter(
          (r) => r.state === "IN_LIBRARY" || r.state === "SHARED_WITH_SPONSOR",
        )
        .sort((a, b) => (b.sharedAt ?? b.createdAt) - (a.sharedAt ?? a.createdAt)),
    [requests],
  );

  const totalAnnualRevenue = useMemo(
    () => libraryItems.reduce((sum, r) => sum + r.projectedAnnualSKURevenue, 0),
    [libraryItems],
  );

  const sharedCount = libraryItems.filter(
    (r) => r.state === "SHARED_WITH_SPONSOR",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Add-on Library
          </h2>
          <p className="max-w-md text-sm text-slate-500">
            Every add-on that started as a customer request and shipped as a
            real, catalog-listed SKU — sold across the entire base.
          </p>
        </div>
        <RevenueCounter
          value={totalAnnualRevenue}
          label="Projected annual SKU revenue"
          sub={`${libraryItems.length} add-ons live · ${sharedCount} sharing revenue with sponsors`}
        />
      </div>

      {libraryItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          <FlowerIcon className="h-8 w-8 opacity-60" />
          Nothing in the library yet — approve a build in Add-on Requests to
          list it here.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {libraryItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
                  {item.title}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    item.state === "SHARED_WITH_SPONSOR"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {item.state === "SHARED_WITH_SPONSOR"
                    ? "Revenue sharing"
                    : "Listed"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {item.description.length > 110
                  ? `${item.description.slice(0, 110)}…`
                  : item.description}
              </p>
              <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                <div>
                  <p className="text-[11px] text-slate-400">
                    Originated from {item.accountName}
                  </p>
                  {item.sharedAt && (
                    <p className="text-[11px] text-slate-400">
                      Shared {formatDate(item.sharedAt)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-slate-900">
                    {formatUSD(item.projectedAnnualSKURevenue)}
                  </p>
                  <p className="text-[11px] text-slate-400">projected ARR/yr</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
