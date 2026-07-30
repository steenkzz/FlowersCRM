"use client";

import { useCallback, useState } from "react";
import UploadZone from "@/components/UploadZone";
import SummaryTab from "@/components/tabs/SummaryTab";
import QualifiedLeadsTab from "@/components/tabs/QualifiedLeadsTab";
import EcommOpportunitiesTab from "@/components/tabs/EcommOpportunitiesTab";
import InnovationPartnersTab from "@/components/tabs/InnovationPartnersTab";
import PipelineTab from "@/components/tabs/PipelineTab";
import AutopilotTab from "@/components/tabs/AutopilotTab";
import AddonLibraryTab from "@/components/tabs/AddonLibraryTab";
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

const TABS: { id: TabId; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "leads", label: "Qualified Leads Module" },
  { id: "ecomm", label: "E-Commerce Opportunities Module" },
  { id: "innovation", label: "Creator's Add-on" },
  { id: "pipeline", label: "Opportunity Funnel" },
  { id: "autopilot", label: "Add-on Requests" },
  { id: "library", label: "Add-on Library" },
];

function FlowerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4.5 w-4.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 2.5c-1.93 0-3.5 1.57-3.5 3.5 0 1.06.47 2 1.22 2.65A3.49 3.49 0 0 0 8.5 12c0 1.06.47 2 1.22 2.65A3.49 3.49 0 0 0 8.5 18c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5c0-1.06-.47-2-1.22-2.65A3.49 3.49 0 0 0 15.5 12c0-1.06-.47-2-1.22-2.65A3.49 3.49 0 0 0 15.5 6c0-1.93-1.57-3.5-3.5-3.5Zm0 2c.83 0 1.5.67 1.5 1.5S12.83 7.5 12 7.5 10.5 6.83 10.5 6 11.17 4.5 12 4.5Zm0 15c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5Z" />
    </svg>
  );
}

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

  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo text-white">
              <FlowerIcon />
            </div>
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              FlowersCRM
            </span>
          </div>
          {fileName && (
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400">{fileName}</span>
              <button
                onClick={reset}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Upload a different file
              </button>
            </div>
          )}
        </div>
        {accounts.length > 0 && (
          <div className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo text-indigo"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-10 px-6 py-12">
        {accounts.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10 text-center">
            <div className="flex flex-col items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
                Your ERP data knows who&apos;s ready to grow.
              </h1>
              <p className="max-w-xl text-lg text-slate-500">
                Upload your customer base and find the accounts to target for
                the new AI storefront + commission play — ranked, researched,
                and ready for outreach.
              </p>
            </div>
            <UploadZone
              onFile={handleFile}
              isLoading={isParsing}
              error={parseError}
            />
          </div>
        ) : (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}
