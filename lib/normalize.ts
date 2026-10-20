// Turns raw SEC "companyfacts" XBRL into clean annual / quarterly statement rows.

export type Fact = {
  start?: string;
  end: string;
  val: number;
  fy?: number;
  fp?: string;
  form: string;
  filed: string;
};

export type CompanyFacts = {
  cik: number;
  entityName: string;
  facts: Record<string, Record<string, { units: Record<string, Fact[]> }>>;
};

export type Values = {
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  operatingCashFlow: number | null;
  assets: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  liabilities: number | null;
  equity: number | null;
  debt: number | null;
  inventory: number | null;
  cash: number | null;
};

export type PeriodRow = {
  label: string;
  end: string;
  fiscalYear: number;
  quarter?: 1 | 2 | 3 | 4;
  values: Values;
};

// Candidate XBRL tags in priority order. Companies switch tags over time
// (e.g. Apple: SalesRevenueNet → RevenueFromContractWithCustomer...), so each
// period takes the first tag that reports it.
export const FLOW_TAGS = {
  revenue: ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet", "RevenueFromContractWithCustomerIncludingAssessedTax"],
  costOfRevenue: ["CostOfGoodsAndServicesSold", "CostOfRevenue", "CostOfGoodsSold"],
  grossProfit: ["GrossProfit"],
  operatingIncome: ["OperatingIncomeLoss"],
  netIncome: ["NetIncomeLoss", "ProfitLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"],
  operatingCashFlow: ["NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"],
} as const;

export const INSTANT_TAGS = {
  assets: ["Assets"],
  currentAssets: ["AssetsCurrent"],
  currentLiabilities: ["LiabilitiesCurrent"],
  liabilities: ["Liabilities"],
  liabilitiesAndEquity: ["LiabilitiesAndStockholdersEquity"],
  equity: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
  longTermDebt: ["LongTermDebt"],
  ltdNoncurrent: ["LongTermDebtNoncurrent"],
  ltdCurrent: ["LongTermDebtCurrent", "DebtCurrent"],
  commercialPaper: ["CommercialPaper", "ShortTermBorrowings"],
  inventory: ["InventoryNet"],
  cash: ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents", "Cash"],
} as const;

type Point = { start?: string; end: string; val: number; filed: string };
type Series = Map<string, Point>;

const DAY = 86_400_000;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
const isFiling = (form: string) => /^10-[KQ]/.test(form);

function usd(facts: CompanyFacts, tag: string): Fact[] {
  return facts.facts["us-gaap"]?.[tag]?.units?.USD ?? [];
}

/** Duration facts (income/cash-flow statement) of roughly the given length, merged across tags. */
export function flowSeries(facts: CompanyFacts, tags: readonly string[], kind: "annual" | "quarter"): Series {
  const [min, max] = kind === "annual" ? [340, 380] : [80, 100];
  const out: Series = new Map();
  for (const tag of tags) {
    const best: Series = new Map();
    for (const f of usd(facts, tag)) {
      if (!f.start || !isFiling(f.form)) continue;
      const d = days(f.start, f.end);
      if (d < min || d > max) continue;
      const prev = best.get(f.end);
      if (!prev || f.filed > prev.filed) best.set(f.end, { start: f.start, end: f.end, val: f.val, filed: f.filed });
    }
    for (const [end, p] of best) if (!out.has(end)) out.set(end, p);
  }
  return out;
}

/** Point-in-time facts (balance sheet), merged across tags, latest filing wins. */
export function instantSeries(facts: CompanyFacts, tags: readonly string[]): Series {
  const out: Series = new Map();
  for (const tag of tags) {
    const best: Series = new Map();
    for (const f of usd(facts, tag)) {
      if (f.start || !isFiling(f.form)) continue;
      const prev = best.get(f.end);
      if (!prev || f.filed > prev.filed) best.set(f.end, { end: f.end, val: f.val, filed: f.filed });
    }
    for (const [end, p] of best) if (!out.has(end)) out.set(end, p);
  }
  return out;
}

/** Fiscal year a period ending on `end` belongs to (retailers ending in Jan/early Feb report the prior year). */
export function fiscalYearOf(end: string): number {
  const d = new Date(end + "T00:00:00Z");
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return m === 1 || (m === 2 && d.getUTCDate() <= 7) ? y - 1 : y;
}

type Loaded = {
  flows: Record<keyof typeof FLOW_TAGS, Series>;
  instants: Record<keyof typeof INSTANT_TAGS, Series>;
};

function load(facts: CompanyFacts, kind: "annual" | "quarter"): Loaded {
  const flows = Object.fromEntries(
    Object.entries(FLOW_TAGS).map(([k, tags]) => [k, flowSeries(facts, tags, kind)]),
  ) as Loaded["flows"];
  const instants = Object.fromEntries(
    Object.entries(INSTANT_TAGS).map(([k, tags]) => [k, instantSeries(facts, tags)]),
  ) as Loaded["instants"];
  return { flows, instants };
}

function valuesAt(l: Loaded, end: string, flow: (k: keyof typeof FLOW_TAGS) => number | null): Values {
  const inst = (k: keyof typeof INSTANT_TAGS) => l.instants[k].get(end)?.val ?? null;

  const revenue = flow("revenue");
  const cogs = flow("costOfRevenue");
  const grossProfit = flow("grossProfit") ?? (revenue !== null && cogs !== null ? revenue - cogs : null);

  const equity = inst("equity");
  const lse = inst("liabilitiesAndEquity");
  const liabilities = inst("liabilities") ?? (lse !== null && equity !== null ? lse - equity : null);

  // Total debt = long-term debt (incl. current portion) + commercial paper / short-term borrowings.
  const nonCur = inst("ltdNoncurrent");
  const cur = inst("ltdCurrent");
  const ltd = inst("longTermDebt") ?? (nonCur !== null || cur !== null ? (nonCur ?? 0) + (cur ?? 0) : null);
  const cp = inst("commercialPaper");
  const debt = ltd !== null || cp !== null ? (ltd ?? 0) + (cp ?? 0) : null;

  return {
    revenue,
    grossProfit,
    operatingIncome: flow("operatingIncome"),
    netIncome: flow("netIncome"),
    operatingCashFlow: flow("operatingCashFlow"),
    assets: inst("assets"),
    currentAssets: inst("currentAssets"),
    currentLiabilities: inst("currentLiabilities"),
    liabilities,
    equity,
    debt,
    inventory: inst("inventory"),
    cash: inst("cash"),
  };
}

/** Fiscal-year rows, oldest first. */
export function annualRows(facts: CompanyFacts): PeriodRow[] {
  const l = load(facts, "annual");
  const ends = new Set([...l.flows.revenue.keys(), ...l.flows.netIncome.keys()]);
  const rows = [...ends].sort().map((end): PeriodRow => {
    const fy = fiscalYearOf(end);
    return {
      label: `FY${fy}`,
      end,
      fiscalYear: fy,
      values: valuesAt(l, end, (k) => l.flows[k].get(end)?.val ?? null),
    };
  });
  // A fiscal year can appear twice if a company changed its year-end; keep the later period.
  return rows.filter((r, i) => rows[i + 1]?.fiscalYear !== r.fiscalYear);
}

/** Fiscal-quarter rows, oldest first. Q4 is derived as full year minus Q1–Q3 (10-Ks don't report it). */
export function quarterlyRows(facts: CompanyFacts): PeriodRow[] {
  const q = load(facts, "quarter");
  const annual = load(facts, "annual");
  const yearEnds = [...annual.flows.revenue.values(), ...annual.flows.netIncome.values()]
    .filter((p, i, a) => a.findIndex((x) => x.end === p.end) === i)
    .sort((a, b) => a.end.localeCompare(b.end));

  const rows: PeriodRow[] = [];
  for (const year of yearEnds) {
    const start = year.start!;
    const fy = fiscalYearOf(year.end);
    const inYear = (end: string) => days(start, end) > 0 && days(end, year.end) > 10;
    const qEnds = [...new Set([...q.flows.revenue.keys(), ...q.flows.netIncome.keys()])].filter(inYear).sort();
    if (qEnds.length !== 3) continue;

    qEnds.forEach((end, i) => {
      rows.push({
        label: `FY${String(fy).slice(2)} Q${i + 1}`,
        end,
        fiscalYear: fy,
        quarter: (i + 1) as 1 | 2 | 3,
        values: valuesAt(q, end, (k) => q.flows[k].get(end)?.val ?? null),
      });
    });

    const q4 = (k: keyof typeof FLOW_TAGS) => {
      const fyVal = annual.flows[k].get(year.end)?.val;
      const parts = qEnds.map((e) => q.flows[k].get(e)?.val);
      if (fyVal === undefined || parts.some((p) => p === undefined)) return null;
      return fyVal - parts.reduce((s: number, p) => s + p!, 0);
    };
    rows.push({ label: `FY${String(fy).slice(2)} Q4`, end: year.end, fiscalYear: fy, quarter: 4, values: valuesAt(q, year.end, q4) });
  }

  // Quarters of the current fiscal year, whose 10-K hasn't been filed yet.
  const lastYear = yearEnds.at(-1);
  if (lastYear) {
    const fy = fiscalYearOf(lastYear.end) + 1;
    const open = [...new Set([...q.flows.revenue.keys(), ...q.flows.netIncome.keys()])]
      .filter((end) => days(lastYear.end, end) > 10 && days(lastYear.end, end) < 300)
      .sort();
    open.forEach((end, i) => {
      rows.push({
        label: `FY${String(fy).slice(2)} Q${i + 1}`,
        end,
        fiscalYear: fy,
        quarter: (i + 1) as 1 | 2 | 3,
        values: valuesAt(q, end, (k) => q.flows[k].get(end)?.val ?? null),
      });
    });
  }
  return rows;
}
