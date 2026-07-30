"use client";

import { useCallback, useState } from "react";
import LandingPage from "@/components/LandingPage";
import FlowerIcon from "@/components/FlowerIcon";
import ThemeToggle from "@/components/ThemeToggle";
import SummaryTab from "@/components/tabs/SummaryTab";
import QualifiedLeadsTab from "@/components/tabs/QualifiedLeadsTab";
import EcommOpportunitiesTab from "@/components/tabs/EcommOpportunitiesTab";
import InnovationPartnersTab from "@/components/tabs/InnovationPartnersTab";
import PipelineTab from "@/components/tabs/PipelineTab";
import AutopilotTab from "@/components/tabs/AutopilotTab";
import AddonLibraryTab from "@/components/tabs/AddonLibraryTab";
import {
  HomeIcon,
  UsersIcon,
  CartIcon,
  SparkleIcon,
  FunnelIcon,
  InboxIcon,
  LibraryIcon,
} from "@/components/icons";
import { parseExcelFile } from "@/lib/excel";
import { DEFAULT_PRICING_CONFIG, type PricingConfig } from "@/lib/pricing";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import { seedInitialRequests } from "@/lib/autopilotSeed";
import type { AddonRequest } from "@/lib/autopilotTypes";
import type {
  Account,
  CacheEntry,
  DraftEmail,
  EcommScanCache,
  EcommScanResult,
  InviteCache,
  MetricWeights,
} from "@/lib/types";

type TabId =
  | "summary"
  | "leads"
  | "ecomm"
  | "innovation"
  | "pipeline"
  | "autopilot"
  | "library";

const TABS: { id: TabId; label: string; icon: typeof HomeIcon }[] = [
  { id: "summary", label: "Summary", icon: HomeIcon },
  { id: "leads", label: "Qualified Leads Module", icon: UsersIcon },
  { id: "ecomm", label: "E-Commerce Opportunities Module", icon: CartIcon },
  { id: "innovation", label: "Creator's Add-on", icon: SparkleIcon },
  { id: "pipeline", label: "Opportunity Funnel", icon: FunnelIcon },
  { id: "autopilot", label: "Add-on Requests", icon: InboxIcon },
  { id: "library", label: "Add-on Library", icon: LibraryIcon },
];

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>({
    ...DEFAULT_PRICING_CONFIG,
  });
  const [weights, setWeights] = useState<MetricWeights>({ ...DEFAULT_WEIGHTS });
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Lifted so the Pipeline tab can read Tab 2 / Tab 3's cached results too
  // ("from the Tab-2 scan if available") and so switching tabs never loses
  // in-flight or completed work.
  const [ecommScanCache, setEcommScanCache] = useState<EcommScanCache>({});
  const [inviteCache, setInviteCache] = useState<InviteCache>({});

  // Lifted so the Add-on Library and Summary tabs can read what Add-on
  // Requests has shipped, without owning any of its processing logic.
  const [addonRequests, setAddonRequests] = useState<AddonRequest[]>([]);

  const updateEcommScanCache = useCallback(
    (accountId: string, entry: CacheEntry<EcommScanResult>) => {
      setEcommScanCache((prev) => ({ ...prev, [accountId]: entry }));
    },
    [],
  );

  const updateInviteCache = useCallback(
    (accountId: string, entry: CacheEntry<DraftEmail>) => {
      setInviteCache((prev) => ({ ...prev, [accountId]: entry }));
    },
    [],
  );

  const handleFile = useCallback(async (file: File) => {
    setParseError(null);
    setIsParsing(true);
    try {
      const {
        accounts: parsed,
        pricingConfig: parsedPricing,
        rowCount,
      } = await parseExcelFile(file);
      if (rowCount === 0) {
        setParseError(
          "No usable rows found. Check that the first sheet has a header row.",
        );
        setAccounts([]);
      } else {
        setAccounts(parsed);
        setPricingConfig(parsedPricing);
        setFileName(file.name);
        setAddonRequests(seedInitialRequests(parsed));
      }
    } catch {
      setParseError(
        "Couldn't read that file. Make sure it's a valid .xlsx export.",
      );
    } finally {
      setIsParsing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAccounts([]);
    setPricingConfig({ ...DEFAULT_PRICING_CONFIG });
    setEcommScanCache({});
    setInviteCache({});
    setAddonRequests([]);
    setFileName(null);
    setWeights({ ...DEFAULT_WEIGHTS });
    setActiveTab("summary");
  }, []);

  if (accounts.length === 0) {
    return (
      <div className="flex flex-1 flex-col bg-canvas">
        <header className="border-b border-slate-200 bg-card">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <FlowerIcon className="h-7 w-7" />
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                FlowersCRM
              </span>
            </div>
            <ThemeToggle className="!text-slate-500 hover:!bg-slate-100 hover:!text-slate-900" />
          </div>
        </header>
        <LandingPage
          onFile={handleFile}
          isLoading={isParsing}
          error={parseError}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar">
        <div className="flex items-center gap-2 px-5 py-5">
          <FlowerIcon className="h-7 w-7" />
          <span className="text-sm font-semibold tracking-tight text-white">
            FlowersCRM
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? "border-indigo bg-sidebar-active text-white"
                    : "border-transparent text-sidebar-text hover:bg-sidebar-active hover:text-white"
                }`}
              >
                <tab.icon className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="relative overflow-hidden border-t border-white/10 px-3 py-2">
          <FlowerIcon className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 opacity-[0.06]" />
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-card">
          <div className="flex items-center justify-end gap-4 px-6 py-4">
            {fileName && (
              <span className="text-xs text-slate-400">{fileName}</span>
            )}
            <button
              onClick={reset}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Upload a different file
            </button>
          </div>
        </header>

        <main className="flex w-full flex-1 flex-col gap-10 px-8 py-10">
          {/* All tabs stay mounted so scan results, AI explanations, drafted
              invitations, pipeline stage moves, and add-on requests survive
              switching tabs — only visibility toggles. */}
          <div className={activeTab === "summary" ? "contents" : "hidden"}>
            <SummaryTab
              accounts={accounts}
              pricingConfig={pricingConfig}
              ecommScanCache={ecommScanCache}
              addonRequests={addonRequests}
              onNavigate={setActiveTab}
            />
          </div>
          <div className={activeTab === "leads" ? "contents" : "hidden"}>
            <QualifiedLeadsTab
              accounts={accounts}
              weights={weights}
              onWeightsChange={setWeights}
            />
          </div>
          <div className={activeTab === "ecomm" ? "contents" : "hidden"}>
            <EcommOpportunitiesTab
              accounts={accounts}
              pricingConfig={pricingConfig}
              cache={ecommScanCache}
              onUpdateCache={updateEcommScanCache}
            />
          </div>
          <div className={activeTab === "innovation" ? "contents" : "hidden"}>
            <InnovationPartnersTab
              accounts={accounts}
              cache={inviteCache}
              onUpdateCache={updateInviteCache}
            />
          </div>
          <div className={activeTab === "pipeline" ? "contents" : "hidden"}>
            <PipelineTab
              accounts={accounts}
              pricingConfig={pricingConfig}
              ecommScanCache={ecommScanCache}
              onUpdateEcommCache={updateEcommScanCache}
              inviteCache={inviteCache}
              onUpdateInviteCache={updateInviteCache}
            />
          </div>
          <div className={activeTab === "autopilot" ? "contents" : "hidden"}>
            <AutopilotTab
              accounts={accounts}
              pricingConfig={pricingConfig}
              requests={addonRequests}
              onRequestsChange={setAddonRequests}
            />
          </div>
          <div className={activeTab === "library" ? "contents" : "hidden"}>
            <AddonLibraryTab requests={addonRequests} />
          </div>
        </main>
      </div>
    </div>
  );
}
