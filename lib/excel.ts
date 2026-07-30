import * as XLSX from "xlsx";
import type { Account } from "./types";
import {
  DEFAULT_PRICING_CONFIG,
  estimateLicenseARR,
  resolveTier,
  type PricingConfig,
} from "./pricing";

type StringField =
  | "accountName"
  | "website"
  | "contactName"
  | "contactRole"
  | "email"
  | "accountType"
  | "region"
  | "paymentStatus"
  | "pricingTier"
  | "notes";

type NumberField =
  | "annualRevenueUSD"
  | "customersOnFile"
  | "valPayGMVUSD"
  | "revenueGrowthYoY"
  | "avgCustomWorkValueUSD"
  | "avgSupportValueUSD"
  | "npsScore"
  | "estLicenseARRUSD";

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
  pricingtier: "pricingTier",
  tier: "pricingTier",
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
  estlicensearrusd: "estLicenseARRUSD",
  estlicensearr: "estLicenseARRUSD",
  licensearrusd: "estLicenseARRUSD",
  licensearr: "estLicenseARRUSD",
};

// Normalized "Pricing Inputs" row label -> PricingConfig key. Both the
// "Pct"-suffixed and symbol-stripped forms are listed since normalizeHeader
// strips "%" entirely (e.g. "Sponsor Share %" -> "sponsorshare").
const PRICING_LABEL_ALIASES: Record<string, keyof PricingConfig> = {
  businessbase: "businessBase",
  businessbaseprice: "businessBase",
  businesstierbase: "businessBase",
  enterprisebase: "enterpriseBase",
  enterprisebaseprice: "enterpriseBase",
  enterprisetierbase: "enterpriseBase",
  userblocksize: "userBlockSize",
  blocksize: "userBlockSize",
  userblockbusiness: "userBlockBusiness",
  businessuserblockprice: "userBlockBusiness",
  businessblockprice: "userBlockBusiness",
  userblockpricebusiness: "userBlockBusiness",
  userblockenterprise: "userBlockEnterprise",
  enterpriseuserblockprice: "userBlockEnterprise",
  enterpriseblockprice: "userBlockEnterprise",
  userblockpriceenterprise: "userBlockEnterprise",
  usersincludedbusiness: "usersIncludedBusiness",
  businessusersincluded: "usersIncludedBusiness",
  includedusersbusiness: "usersIncludedBusiness",
  usersincludedenterprise: "usersIncludedEnterprise",
  enterpriseusersincluded: "usersIncludedEnterprise",
  includedusersenterprise: "usersIncludedEnterprise",
  tiergaterevenuemillions: "tierGateRevenueMillions",
  tiergaterevenue: "tierGateRevenueMillions",
  revenuetiergate: "tierGateRevenueMillions",
  tiergatemillions: "tierGateRevenueMillions",
  sponsorsharepct: "sponsorSharePct",
  sponsorshare: "sponsorSharePct",
  sponsorsharepercentage: "sponsorSharePct",
  sponsorpayoutcap: "sponsorPayoutCap",
  payoutcap: "sponsorPayoutCap",
  sponsorcap: "sponsorPayoutCap",
  sunsetwindowmonths: "sunsetWindowMonths",
  sunsetwindow: "sunsetWindowMonths",
  sunsetmonths: "sunsetWindowMonths",
  addonpermodule: "addOnPerModule",
  addonmodule: "addOnPerModule",
  addonpricepermodule: "addOnPerModule",
  moduleaddonprice: "addOnPerModule",
  customexclusiverate: "customExclusiveRate",
  exclusiverate: "customExclusiveRate",
  customexclusive: "customExclusiveRate",
  customroadmaprate: "customRoadmapRate",
  roadmaprate: "customRoadmapRate",
  customroadmap: "customRoadmapRate",
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
  const isPercent = str.includes("%");
  const cleaned = str.replace(/[^0-9.\-]/g, "");
  const parsed = parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return isPercent ? parsed / 100 : parsed;
}

function findSheetName(
  sheetNames: string[],
  matcher: (normalized: string) => boolean,
): string | undefined {
  return sheetNames.find((name) => matcher(normalizeHeader(name)));
}

/** Parses the "Pricing Inputs" sheet: label in col A, value in col C. */
function parsePricingInputs(
  workbook: XLSX.WorkBook,
  sheetName: string | undefined,
): PricingConfig {
  const config: PricingConfig = { ...DEFAULT_PRICING_CONFIG };
  if (!sheetName) return config;

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  for (const row of rows) {
    const label = cellToString(row[0]);
    if (!label) continue;
    const key = PRICING_LABEL_ALIASES[normalizeHeader(label)];
    if (!key) continue;
    const value = cellToNumber(row[2]);
    if (value !== 0 || cellToString(row[2]) === "0") {
      config[key] = value;
    }
  }

  return config;
}

export interface ParsedExcelResult {
  accounts: Account[];
  pricingConfig: PricingConfig;
  unknownColumns: string[];
  rowCount: number;
}

export async function parseExcelFile(file: File): Promise<ParsedExcelResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const pricingSheetName = findSheetName(
    workbook.SheetNames,
    (n) => n === "pricinginputs",
  );
  const pricingConfig = parsePricingInputs(workbook, pricingSheetName);

  const crmSheetName =
    workbook.SheetNames.find((n) => n !== pricingSheetName) ??
    workbook.SheetNames[0];
  if (!crmSheetName) {
    return { accounts: [], pricingConfig, unknownColumns: [], rowCount: 0 };
  }

  const sheet = workbook.Sheets[crmSheetName];
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
      pricingTier: "",
      estLicenseARRUSD: 0,
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

    // Fill Pricing Tier / Est. License ARR from pricingConfig when the
    // sheet didn't supply them.
    const tier = resolveTier(
      account.pricingTier,
      account.annualRevenueUSD,
      pricingConfig,
    );
    account.pricingTier = tier;
    if (account.estLicenseARRUSD <= 0) {
      account.estLicenseARRUSD = estimateLicenseARR(tier, pricingConfig);
    }

    return account;
  });

  const filtered = accounts.filter(
    (a) => a.accountName.trim() !== "" || Object.keys(a.extra).length > 0,
  );

  return {
    accounts: filtered,
    pricingConfig,
    unknownColumns: Array.from(unknownColumns),
    rowCount: filtered.length,
  };
}
