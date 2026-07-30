"use client";

import { useMemo } from "react";
import { formatUSD, formatCompactNumber } from "@/lib/format";
import { scoreAccounts } from "@/lib/scoring";
import {
  computeEcommValue,
  computeInnovationValue,
  isEcommCandidate,
} from "@/lib/pipeline";
import { DEFAULT_WEIGHTS, type Account, type EcommScanCache } from "@/lib/types";
import type { PricingConfig } from "@/lib/pricing";
import type { AddonRequest } from "@/lib/autopilotTypes";

export type SummaryTabId =
  | "leads"
  | "ecomm"
  | "innovation"
  | "pipeline"
  | "autopilot"
  | "library";

interface SummaryTabProps {
  accounts: Account[];
  pricingConfig: PricingConfig;
  ecommScanCache: EcommScanCache;
  addonRequests: AddonRequest[];
  onNavigate: (tab: SummaryTabId) => void;
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-card p-5">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function ModuleCard({
  step,
  title,
  description,
  stat,
  onClick,
}: {
  step: string;
  title: string;
  description: string;
  stat: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-card p-5 text-left shadow-sm transition-colors hover:border-indigo/50"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-light text-[11px] font-bold text-indigo">
          {step}
        </span>
        <span className="text-sm font-semibold text-slate-900">{title}</span>
      </div>
      <p className="text-xs text-slate-500">{description}</p>
      <p className="mt-auto text-sm font-semibold tabular-nums text-indigo">
        {stat}
      </p>
    </button>
  );
}

export default function SummaryTab({
  accounts,
  pricingConfig,
  ecommScanCache,
  addonRequests,
  onNavigate,
}: SummaryTabProps) {
  const totalAnnualRevenue = useMemo(
    () => accounts.reduce((sum, a) => sum + a.annualRevenueUSD, 0),
    [accounts],
  );

  const scored = useMemo(
    () => scoreAccounts(accounts, DEFAULT_WEIGHTS),
    [accounts],
  );
  const qualifiedCount = useMemo(
    () => scored.filter((s) => s.score >= 75).length,
    [scored],
  );

  const ecommCandidates = useMemo(
    () => accounts.filter(isEcommCandidate),
    [accounts],
  );
  const ecommOpportunity = useMemo(
    () =>
      ecommCandidates.reduce(
        (sum, a) => sum + computeEcommValue(a, pricingConfig, ecommScanCache).value,
        0,
      ),
    [ecommCandidates, pricingConfig, ecommScanCache],
  );

  const innovationCandidates = useMemo(
    () => accounts.filter((a) => a.avgCustomWorkValueUSD > 0),
    [accounts],
  );
  const innovationOpportunity = useMemo(
    () =>
      innovationCandidates.reduce(
        (sum, a) => sum + computeInnovationValue(a, pricingConfig).value,
        0,
      ),
    [innovationCandidates, pricingConfig],
  );

  const libraryItems = useMemo(
    () =>
      addonRequests.filter(
        (r) => r.state === "IN_LIBRARY" || r.state === "SHARED_WITH_SPONSOR",
      ),
    [addonRequests],
  );
  const libraryRevenue = useMemo(
    () => libraryItems.reduce((sum, r) => sum + r.projectedAnnualSKURevenue, 0),
    [libraryItems],
  );

  const openRequests = addonRequests.filter(
    (r) =>
      r.state !== "IN_LIBRARY" &&
      r.state !== "SHARED_WITH_SPONSOR" &&
      r.state !== "REJECTED_REPLIED" &&
      r.state !== "CUSTOMER_DECLINED",
  ).length;

  const totalUpside = ecommOpportunity + innovationOpportunity + libraryRevenue;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Growing revenue from the base you already own
        </h2>
        <p className="max-w-2xl text-sm text-slate-500">
          One engine, three compounding loops — qualify the base, expand it
          with e-commerce and add-ons, and turn every custom build into a new
          SKU sold across the whole install base.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          label="Customer base"
          value={formatCompactNumber(accounts.length)}
          sub={`${formatUSD(totalAnnualRevenue)} total ARR on file`}
        />
        <StatTile
          label="Qualified opportunities"
          value={formatCompactNumber(qualifiedCount)}
          sub="scored 75+ on six signals"
        />
        <StatTile
          label="Compounding upside"
          value={formatUSD(totalUpside)}
          sub="e-commerce + add-ons, per year"
        />
        <StatTile
          label="Add-ons shipped"
          value={formatCompactNumber(libraryItems.length)}
          sub={
            openRequests > 0
              ? `${openRequests} in the pipeline`
              : "live in the library"
          }
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          The engine — jump into any module
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ModuleCard
            step="1"
            title="Qualified Leads Module"
            description="An agent scores every account on six signals and ranks the deals worth a call."
            stat={`${qualifiedCount} scored 75+`}
            onClick={() => onNavigate("leads")}
          />
          <ModuleCard
            step="2"
            title="E-Commerce Opportunities Module"
            description="AI-generated storefronts plus a 1% GMV commission — sized per account."
            stat={`${formatUSD(ecommOpportunity)} opportunity`}
            onClick={() => onNavigate("ecomm")}
          />
          <ModuleCard
            step="3"
            title="Creator's Add-on"
            description="Invite the accounts with the highest custom-work spend into the program."
            stat={`${innovationCandidates.length} candidates`}
            onClick={() => onNavigate("innovation")}
          />
          <ModuleCard
            step="4"
            title="Opportunity Funnel"
            description="Deal-by-deal pipeline for both growth plays, stage by stage."
            stat="View the board"
            onClick={() => onNavigate("pipeline")}
          />
          <ModuleCard
            step="5"
            title="Add-on Requests"
            description="Autonomous evaluation, quoting, negotiation, and build of every incoming request."
            stat={`${openRequests} in flight`}
            onClick={() => onNavigate("autopilot")}
          />
          <ModuleCard
            step="6"
            title="Add-on Library"
            description="Every request that became a real SKU, sold across the entire base."
            stat={`${formatUSD(libraryRevenue)} projected ARR`}
            onClick={() => onNavigate("library")}
          />
        </div>
      </div>
    </div>
  );
}
