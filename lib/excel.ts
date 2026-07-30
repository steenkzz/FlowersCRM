import * as XLSX from "xlsx";
import type { Account } from "./types";

type StringField =
  | "accountName"
  | "website"
  | "contactName"
  | "contactRole"
  | "email"
  | "accountType"
  | "region"
  | "paymentStatus"
  | "notes";

type NumberField =
  | "annualRevenueUSD"
  | "customersOnFile"
  | "valPayGMVUSD"
  | "revenueGrowthYoY"
  | "avgCustomWorkValueUSD"
  | "avgSupportValueUSD"
  | "npsScore";

const STRING_ALIASES: Record<string, StringField> = {
  accountname: "accountName",
  account: "accountName",
  company: "accountName",
  companyname: "accountName",
  website: "website",
  url: "website",
  domain: "website",
  contactname: "contactName",
  contact: "contactName",
  name: "contactName",
  contactrole: "contactRole",
  contractrole: "contactRole", // common typo
  role: "contactRole",
  title: "contactRole",
  email: "email",
  emailaddress: "email",
  accounttype: "accountType",
  type: "accountType",
  region: "region",
  location: "region",
  country: "region",
  paymentstatus: "paymentStatus",
  payment: "paymentStatus",
  billingstatus: "paymentStatus",
  notes: "notes",
  note: "notes",
  comments: "notes",
};

const NUMBER_ALIASES: Record<string, NumberField> = {
  annualrevenueusd: "annualRevenueUSD",
  annualrevenue: "annualRevenueUSD",
  revenue: "annualRevenueUSD",
  customersonfile: "customersOnFile",
  customers: "customersOnFile",
  customercount: "customersOnFile",
  valpaygmvusd: "valPayGMVUSD",
  valpaygmv: "valPayGMVUSD",
  gmv: "valPayGMVUSD",
  revenuegrowthyoy: "revenueGrowthYoY",
  revenuegrowth: "revenueGrowthYoY",
  growthyoy: "revenueGrowthYoY",
  yoygrowth: "revenueGrowthYoY",
  avgyearlycustomworkvalueusd: "avgCustomWorkValueUSD",
  avgcustomworkvalueusd: "avgCustomWorkValueUSD",
  avgcustomworkvalue: "avgCustomWorkValueUSD",
  customworkvalue: "avgCustomWorkValueUSD",
  avgsupportvalueusd: "avgSupportValueUSD",
  avgsupportvalue: "avgSupportValueUSD",
  supportvalue: "avgSupportValueUSD",
  npsscore: "npsScore",
  nps: "npsScore",
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function cellToNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const str = cellToString(value);
  if (!str) return 0;
  const cleaned = str.replace(/[^0-9.\-]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
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
    raw: true,
  });

  const unknownColumns = new Set<string>();
  const accounts: Account[] = rows.map((row, index) => {
    const account: Account = {
      id: `row-${index}-${Date.now()}`,
      accountName: "",
      website: "",
      contactName: "",
      contactRole: "",
      email: "",
      accountType: "",
      region: "",
      annualRevenueUSD: 0,
      customersOnFile: 0,
      valPayGMVUSD: 0,
      revenueGrowthYoY: 0,
      avgCustomWorkValueUSD: 0,
      avgSupportValueUSD: 0,
      paymentStatus: "",
      npsScore: 0,
      notes: "",
      extra: {},
    };

    for (const [rawHeader, rawValue] of Object.entries(row)) {
      const normalized = normalizeHeader(rawHeader);
      const stringField = STRING_ALIASES[normalized];
      const numberField = NUMBER_ALIASES[normalized];

      if (stringField) {
        account[stringField] = cellToString(rawValue);
      } else if (numberField) {
        account[numberField] = cellToNumber(rawValue);
      } else {
        const value = cellToString(rawValue);
        if (rawHeader.trim() && value) {
          account.extra[rawHeader.trim()] = value;
          unknownColumns.add(rawHeader.trim());
        }
      }
    }

    return account;
  });

  const filtered = accounts.filter(
    (a) => a.accountName.trim() !== "" || Object.keys(a.extra).length > 0,
  );

  return {
    accounts: filtered,
    unknownColumns: Array.from(unknownColumns),
    rowCount: filtered.length,
  };
}
