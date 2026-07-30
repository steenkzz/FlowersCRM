"use client";

import { useState } from "react";
import UploadZone from "@/components/UploadZone";
import AccountsTable from "@/components/AccountsTable";
import { parseExcelFile } from "@/lib/excel";
import type { Account } from "@/lib/types";

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setIsLoading(true);
    try {
      const { accounts: parsed, rowCount } = await parseExcelFile(file);
      if (rowCount === 0) {
        setError(
          "No usable rows found. Check that the first sheet has a header row.",
        );
        setAccounts([]);
      } else {
        setAccounts(parsed);
        setFileName(file.name);
      }
    } catch {
      setError("Couldn't read that file. Make sure it's a valid .xlsx export.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo text-xs font-bold text-white">
              IC
            </div>
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              Intelligence CRM
            </span>
          </div>
          {fileName && (
            <span className="text-xs text-slate-400">{fileName}</span>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-16">
        {accounts.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10 text-center">
            <div className="flex flex-col items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
                Don&apos;t migrate your CRM.
              </h1>
              <p className="max-w-lg text-lg text-slate-500">
                Drop in your spreadsheet and get an intelligent CRM in 30
                seconds — every account researched, scored, and ready for
                outreach.
              </p>
            </div>
            <UploadZone onFile={handleFile} isLoading={isLoading} error={error} />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {accounts.length} accounts parsed
                </h2>
                <p className="text-sm text-slate-500">
                  Reviewing before enrichment — next up: AI research + scoring.
                </p>
              </div>
              <button
                onClick={() => {
                  setAccounts([]);
                  setFileName(null);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Upload a different file
              </button>
            </div>
            <AccountsTable accounts={accounts} />
          </div>
        )}
      </main>
    </div>
  );
}
