"use client";

import type { Account } from "@/lib/types";

interface AccountsTableProps {
  accounts: Account[];
}

const COLUMNS: { key: keyof Account; label: string }[] = [
  { key: "company", label: "Company" },
  { key: "contactName", label: "Contact" },
  { key: "contactRole", label: "Role" },
  { key: "sector", label: "Sector" },
  { key: "region", label: "Region" },
  { key: "currentSoftware", label: "Current Software" },
  { key: "annualRevenueEUR", label: "Revenue (EUR)" },
  { key: "openOpportunity", label: "Open Opportunity" },
];

export default function AccountsTable({ accounts }: AccountsTableProps) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        No rows found in this file.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-slate-200 px-4 py-3 whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr
                key={account.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className="max-w-[220px] truncate px-4 py-2.5 text-slate-700"
                    title={String(account[col.key] ?? "")}
                  >
                    {col.key === "company" ? (
                      <span className="font-medium text-slate-900">
                        {account.company || "—"}
                      </span>
                    ) : (
                      String(account[col.key] ?? "") || (
                        <span className="text-slate-300">—</span>
                      )
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
