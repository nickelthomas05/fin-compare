import type { PeriodRow } from "./normalize";

export type RatioKey =
  | "revenueGrowth"
  | "netIncomeGrowth"
  | "grossMargin"
  | "operatingMargin"
  | "netMargin"
  | "roa"
  | "roe"
  | "currentRatio"
  | "quickRatio"
  | "cashRatio"
  | "debtToEquity"
  | "debtToAssets"
  | "liabilitiesToEquity"
  | "equityMultiplier";

export type Category = "growth" | "profitability" | "liquidity" | "leverage";

export type RatioDef = {
  key: RatioKey;
  label: string;
  category: Category;
  format: "pct" | "x";
  /** true: higher is better, false: lower is better */
  higherIsBetter: boolean;
  formula: string;
  meaning: string;
  /** Available to every plan in the trend chart; the rest are Pro-only. */
  core?: boolean;
};

export const RATIOS: RatioDef[] = [
  { key: "revenueGrowth", label: "Revenue growth", category: "growth", format: "pct", higherIsBetter: true, core: true, formula: "(Revenue − prior Revenue) ÷ prior Revenue", meaning: "How fast sales are expanding versus the same period a year earlier." },
  { key: "netIncomeGrowth", label: "Net income growth", category: "growth", format: "pct", higherIsBetter: true, formula: "(Net income − prior) ÷ |prior|", meaning: "How fast bottom-line profit is expanding; faster than revenue growth signals operating leverage." },
  { key: "grossMargin", label: "Gross margin", category: "profitability", format: "pct", higherIsBetter: true, formula: "Gross profit ÷ Revenue", meaning: "Share of each sales dollar left after direct costs — a sign of pricing power and product mix." },
  { key: "operatingMargin", label: "Operating margin", category: "profitability", format: "pct", higherIsBetter: true, core: true, formula: "Operating income ÷ Revenue", meaning: "Profit from core operations per sales dollar, after R&D, SG&A and other operating costs." },
  { key: "netMargin", label: "Net margin", category: "profitability", format: "pct", higherIsBetter: true, core: true, formula: "Net income ÷ Revenue", meaning: "Cents of final profit per dollar of revenue, after interest and taxes." },
  { key: "roa", label: "Return on assets", category: "profitability", format: "pct", higherIsBetter: true, core: true, formula: "Net income ÷ Average total assets", meaning: "How efficiently the company turns its asset base into profit." },
  { key: "roe", label: "Return on equity", category: "profitability", format: "pct", higherIsBetter: true, formula: "Net income ÷ Average shareholders' equity", meaning: "Profit generated on shareholders' capital; boosted by leverage and buybacks." },
  { key: "currentRatio", label: "Current ratio", category: "liquidity", format: "x", higherIsBetter: true, core: true, formula: "Current assets ÷ Current liabilities", meaning: "Ability to cover obligations due within a year with assets convertible within a year." },
  { key: "quickRatio", label: "Quick ratio", category: "liquidity", format: "x", higherIsBetter: true, formula: "(Current assets − Inventory) ÷ Current liabilities", meaning: "A stricter liquidity test that excludes inventory, which may be slow to sell." },
  { key: "cashRatio", label: "Cash ratio", category: "liquidity", format: "x", higherIsBetter: true, formula: "Cash & equivalents ÷ Current liabilities", meaning: "The most conservative liquidity test — cash on hand only." },
  { key: "debtToEquity", label: "Debt-to-equity", category: "leverage", format: "x", higherIsBetter: false, core: true, formula: "Total debt ÷ Shareholders' equity", meaning: "How much borrowed money funds the business relative to owners' capital." },
  { key: "debtToAssets", label: "Debt-to-assets", category: "leverage", format: "pct", higherIsBetter: false, formula: "Total debt ÷ Total assets", meaning: "Share of assets financed with debt." },
  { key: "liabilitiesToEquity", label: "Liabilities-to-equity", category: "leverage", format: "x", higherIsBetter: false, formula: "Total liabilities ÷ Shareholders' equity", meaning: "All obligations (not just debt) relative to equity — works for banks too." },
  { key: "equityMultiplier", label: "Equity multiplier", category: "leverage", format: "x", higherIsBetter: false, formula: "Average total assets ÷ Average equity", meaning: "DuPont leverage factor: ROE = ROA × equity multiplier." },
];

export const RATIO_BY_KEY = Object.fromEntries(RATIOS.map((r) => [r.key, r])) as Record<RatioKey, RatioDef>;

export type Ratios = Record<RatioKey, number | null>;
export type RatioRow = PeriodRow & { ratios: Ratios };

export function div(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a === null || a === undefined || b === null || b === undefined || b === 0) return null;
  return a / b;
}

function avg(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a === null || a === undefined) return null;
  if (b === null || b === undefined) return a;
  return (a + b) / 2;
}

function growth(cur: number | null, prev: number | null | undefined): number | null {
  if (cur === null || prev === null || prev === undefined || prev === 0) return null;
  return (cur - prev) / Math.abs(prev);
}

/**
 * Adds ratios to each row. `mode` controls comparisons: annual rows compare to the
 * prior row; quarterly rows compare growth to the same quarter a year earlier and
 * annualize ROA/ROE (×4).
 */
export function withRatios(rows: PeriodRow[], mode: "annual" | "quarterly"): RatioRow[] {
  const lag = mode === "annual" ? 1 : 4;
  const scale = mode === "annual" ? 1 : 4;
  return rows.map((row, i) => {
    const v = row.values;
    const prev = rows[i - 1]?.values;
    const yearAgo = rows[i - lag]?.values;
    const avgAssets = avg(v.assets, prev?.assets);
    const avgEquity = avg(v.equity, prev?.equity);
    const positiveEquity = v.equity !== null && v.equity > 0;
    const annualNI = v.netIncome === null ? null : v.netIncome * scale;

    const ratios: Ratios = {
      revenueGrowth: growth(v.revenue, yearAgo?.revenue),
      netIncomeGrowth: growth(v.netIncome, yearAgo?.netIncome),
      grossMargin: div(v.grossProfit, v.revenue),
      operatingMargin: div(v.operatingIncome, v.revenue),
      netMargin: div(v.netIncome, v.revenue),
      roa: div(annualNI, avgAssets),
      roe: avgEquity !== null && avgEquity > 0 ? div(annualNI, avgEquity) : null,
      currentRatio: div(v.currentAssets, v.currentLiabilities),
      quickRatio:
        v.currentAssets === null ? null : div(v.currentAssets - (v.inventory ?? 0), v.currentLiabilities),
      cashRatio: div(v.cash, v.currentLiabilities),
      debtToEquity: positiveEquity ? div(v.debt, v.equity) : null,
      debtToAssets: div(v.debt, v.assets),
      liabilitiesToEquity: positiveEquity ? div(v.liabilities, v.equity) : null,
      equityMultiplier: avgEquity !== null && avgEquity > 0 ? div(avgAssets, avgEquity) : null,
    };
    return { ...row, ratios };
  });
}

/** Compound annual growth rate between the first and last value of a series. */
export function cagr(first: number | null, last: number | null, years: number): number | null {
  if (first === null || last === null || first <= 0 || last <= 0 || years <= 0) return null;
  return Math.pow(last / first, 1 / years) - 1;
}
