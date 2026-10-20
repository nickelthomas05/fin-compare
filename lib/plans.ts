export type PlanId = "free" | "standard" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  /** Stripe Price lookup_key (paid plans only). */
  lookupKey?: string;
  maxCompanies: number;
  quarterly: boolean;
  years: number;
  quarters: number;
  csvExport: boolean;
  allRatioTrends: boolean;
  savedComparisons: boolean;
  pdfReport: boolean;
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    maxCompanies: 2,
    quarterly: false,
    years: 3,
    quarters: 0,
    csvExport: false,
    allRatioTrends: false,
    savedComparisons: false,
    pdfReport: false,
    features: ["Compare 2 companies", "Annual statements, last 3 years", "Core ratio charts", "Plain-English insights"],
  },
  standard: {
    id: "standard",
    name: "Standard",
    price: 20,
    lookupKey: "fincompare_standard_monthly",
    maxCompanies: 4,
    quarterly: true,
    years: 10,
    quarters: 12,
    csvExport: true,
    allRatioTrends: false,
    savedComparisons: false,
    pdfReport: false,
    features: ["Compare up to 4 companies", "Quarterly + annual data", "10 years of history", "CSV export"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 30,
    lookupKey: "fincompare_pro_monthly",
    maxCompanies: 6,
    quarterly: true,
    years: 10,
    quarters: 12,
    csvExport: true,
    allRatioTrends: true,
    savedComparisons: true,
    pdfReport: true,
    features: ["Everything in Standard", "Compare up to 6 companies", "Every ratio trend chart", "Saved comparisons", "Printable PDF report"],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "standard", "pro"];

export function planForLookupKey(key: string | null | undefined): PlanId | null {
  return PLAN_ORDER.find((id) => PLANS[id].lookupKey && PLANS[id].lookupKey === key) ?? null;
}

/** Subscription statuses that keep paid access (past_due keeps access while Stripe retries). */
export const ACTIVE_STATUSES = ["active", "trialing", "past_due"];
