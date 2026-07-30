import * as XLSX from "xlsx";
import type { Account } from "./types";

// Maps a normalized header (lowercased, alphanumerics only) to a canonical Account field.
// Includes tolerant aliases for common renames/typos (e.g. "Contract Role", "Open Oppertunity").
const HEADER_ALIASES: Record<string, keyof Omit<Account, "id" | "extra">> = {
  company: "company",
  companyname: "company",
  account: "company",
  accountname: "company",
  website: "website",
  url: "website",
  domain: "website",
  contactname: "contactName",
  contact: "contactName",
  name: "contactName",
  contactrole: "contactRole",
  contractrole: "contactRole", // common typo for "Contact Role"
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
  annualcontractvalueusd: "annualContractValueUSD",
  annualcontractvalue: "annualContractValueUSD",
  acv: "annualContractValueUSD",
  contractvalue: "annualContractValueUSD",
  // legacy schema support
  annualrevenueeur: "annualContractValueUSD",
  annualrevenue: "annualContractValueUSD",
  revenue: "annualContractValueUSD",
  contractrenewaldate: "contractRenewalDate",
  renewaldate: "contractRenewalDate",
  renewal: "contractRenewalDate",
  paymentstatus: "paymentStatus",
  payment: "paymentStatus",
  billingstatus: "paymentStatus",
  supporttickets12m: "supportTickets12m",
  supporttickets: "supportTickets12m",
  tickets12m: "supportTickets12m",
  tickets: "supportTickets12m",
  npsscore: "npsScore",
  nps: "npsScore",
  lastactivity: "lastActivity",
  lastcontact: "lastActivity",
  lasttouch: "lastActivity",
  currentinternalsoftware: "currentInternalSoftware",
  internalsoftware: "currentInternalSoftware",
  // legacy schema support
  currentsoftware: "currentInternalSoftware",
  software: "currentInternalSoftware",
  crm: "currentInternalSoftware",
  openopportunity: "openOpportunity",
  openoppertunity: "openOpportunity", // common typo
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
      website: "",
      contactName: "",
      contactRole: "",
      email: "",
      sector: "",
      employees: "",
      annualContractValueUSD: "",
      contractRenewalDate: "",
      paymentStatus: "",
      supportTickets12m: "",
      npsScore: "",
      lastActivity: "",
      currentInternalSoftware: "",
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
