import * as XLSX from "xlsx";
import type { Account } from "./types";

// Maps a normalized header (lowercased, alphanumerics only) to a canonical Account field.
const HEADER_ALIASES: Record<string, keyof Omit<Account, "id" | "extra">> = {
  company: "company",
  companyname: "company",
  account: "company",
  accountname: "company",
  contactname: "contactName",
  contact: "contactName",
  name: "contactName",
  contactrole: "contactRole",
  role: "contactRole",
  title: "contactRole",
  jobtitle: "contactRole",
  email: "email",
  emailaddress: "email",
  sector: "sector",
  industry: "sector",
  employees: "employees",
  employeecount: "employees",
  companysize: "employees",
  region: "region",
  location: "region",
  country: "region",
  currentsoftware: "currentSoftware",
  software: "currentSoftware",
  crm: "currentSoftware",
  customersince: "customerSince",
  since: "customerSince",
  customeryear: "customerSince",
  lastactivity: "lastActivity",
  lastcontact: "lastActivity",
  lasttouch: "lastActivity",
  annualrevenueeur: "annualRevenueEUR",
  annualrevenue: "annualRevenueEUR",
  revenue: "annualRevenueEUR",
  openopportunity: "openOpportunity",
  opportunity: "openOpportunity",
  opendeal: "openOpportunity",
  notes: "notes",
  note: "notes",
  comments: "notes",
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

export interface ParsedExcelResult {
  accounts: Account[];
  unknownColumns: string[];
  rowCount: number;
}

export async function parseExcelFile(file: File): Promise<ParsedExcelResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { accounts: [], unknownColumns: [], rowCount: 0 };
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const unknownColumns = new Set<string>();
  const accounts: Account[] = rows.map((row, index) => {
    const account: Account = {
      id: `row-${index}-${Date.now()}`,
      company: "",
      contactName: "",
      contactRole: "",
      email: "",
      sector: "",
      employees: "",
      region: "",
      currentSoftware: "",
      customerSince: "",
      lastActivity: "",
      annualRevenueEUR: "",
      openOpportunity: "",
      notes: "",
      extra: {},
    };

    for (const [rawHeader, rawValue] of Object.entries(row)) {
      const normalized = normalizeHeader(rawHeader);
      const field = HEADER_ALIASES[normalized];
      const value = cellToString(rawValue);
      if (field) {
        account[field] = value;
      } else if (rawHeader.trim() && value) {
        account.extra[rawHeader.trim()] = value;
        unknownColumns.add(rawHeader.trim());
      }
    }

    return account;
  });

  // Drop fully-empty rows (no company name, nothing else useful either)
  const filtered = accounts.filter(
    (a) => a.company.trim() !== "" || Object.keys(a.extra).length > 0,
  );

  return {
    accounts: filtered,
    unknownColumns: Array.from(unknownColumns),
    rowCount: filtered.length,
  };
}
