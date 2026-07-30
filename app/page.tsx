"use client";

import { useCallback, useState } from "react";
import UploadZone from "@/components/UploadZone";
import QualifiedLeadsTab from "@/components/tabs/QualifiedLeadsTab";
import EcommOpportunitiesTab from "@/components/tabs/EcommOpportunitiesTab";
import InnovationPartnersTab from "@/components/tabs/InnovationPartnersTab";
import { parseExcelFile } from "@/lib/excel";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import type { Account, MetricWeights } from "@/lib/types";

type TabId = "leads" | "ecomm" | "innovation";

const TABS: { id: TabId; label: string }[] = [
  { id: "leads", label: "Qualified Leads" },
  { id: "ecomm", label: "E-Commerce Opportunities" },
  { id: "innovation", label: "Innovation Partners" },
];

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [weights, setWeights] = useState<MetricWeights>({ ...DEFAULT_WEIGHTS });
  const [activeTab, setActiveTab] = useState<TabId>("leads");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setParseError(null);
    setIsParsing(true);
    try {
      const { accounts: parsed, rowCount } = await parseExcelFile(file);
      if (rowCount === 0) {
        setParseError(
          "No usable rows found. Check that the first sheet has a header row.",
        );
        setAccounts([]);
      } else {
        setAccounts(parsed);
        setFileName(file.name);
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
    setFileName(null);
    setWeights({ ...DEFAULT_WEIGHTS });
    setActiveTab("leads");
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo text-xs font-bold text-white">
              GI
            </div>
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              Growth Intelligence
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
          <div className="mx-auto flex max-w-6xl gap-1 px-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
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

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12">
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
            {activeTab === "leads" && (
              <QualifiedLeadsTab
                accounts={accounts}
                weights={weights}
                onWeightsChange={setWeights}
              />
            )}
            {activeTab === "ecomm" && (
              <EcommOpportunitiesTab accounts={accounts} />
            )}
            {activeTab === "innovation" && (
              <InnovationPartnersTab accounts={accounts} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
