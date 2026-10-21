import "server-only";
import { findTicker, getCompanyFacts } from "./edgar";
import { explain, type Insight } from "./explain";
import { getProfile, type Profile } from "./finnhub";
import { annualRows, quarterlyRows } from "./normalize";
import type { Plan } from "./plans";
import { withRatios, type RatioRow } from "./ratios";
import { createAdminClient } from "./supabase/server";

export type CompanyData = {
  ticker: string;
  cik: number;
  name: string;
  annual: RatioRow[];
  quarterly: RatioRow[];
};

export type ComparedCompany = { ticker: string; name: string; profile: Profile | null; rows: RatioRow[] };

const CACHE_HOURS = 24;

/** Normalized statements + ratios for a ticker, cached in Supabase when available. */
export async function loadCompany(ticker: string): Promise<CompanyData> {
  const t = ticker.trim().toUpperCase();
  const admin = createAdminClient();

  let cached: CompanyData | null = null;
  if (admin) {
    const { data } = await admin.from("company_financials").select("data, fetched_at").eq("ticker", t).maybeSingle();
    if (data) {
      cached = data.data as CompanyData;
      if (Date.now() - Date.parse(data.fetched_at) < CACHE_HOURS * 3_600_000) return cached;
    }
  }

  let entry: Awaited<ReturnType<typeof findTicker>>;
  let facts: Awaited<ReturnType<typeof getCompanyFacts>>;
  try {
    entry = await findTicker(t);
    if (!entry) throw new UserError(`Unknown ticker "${t}". Pick a US-listed company that files with the SEC.`);
    facts = await getCompanyFacts(entry.cik);
  } catch (err) {
    if (err instanceof UserError) throw err;
    // SEC unavailable: fall back to the last cached copy, however old, rather than failing.
    if (cached) return cached;
    if (err instanceof Error && /\(404\)/.test(err.message))
      throw new UserError(`${t} has no XBRL financial data at the SEC. Foreign companies that file 20-F or 40-F reports aren't supported.`);
    throw err;
  }
  const company: CompanyData = {
    ticker: t,
    cik: entry.cik,
    name: facts.entityName || entry.name,
    annual: withRatios(annualRows(facts), "annual"),
    quarterly: withRatios(quarterlyRows(facts), "quarterly"),
  };
  if (company.annual.length === 0) throw new UserError(`${t} has no annual US-GAAP statements in SEC data. Foreign companies that report under IFRS (Form 20-F) aren't supported.`);

  if (admin) {
    await admin
      .from("company_financials")
      .upsert({ ticker: t, cik: entry.cik, name: company.name, data: company, fetched_at: new Date().toISOString() });
  }
  return company;
}

export class UserError extends Error {}

export function parseTickers(raw: string | null): string[] {
  return [...new Set((raw ?? "").split(",").map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z][A-Z0-9.\-]{0,9}$/.test(s)))];
}

/** Applies plan limits and builds the comparison payload. Throws UserError for limit violations. */
export async function compare(tickers: string[], period: "annual" | "quarterly", plan: Plan) {
  if (tickers.length < 2) throw new UserError("Select at least two companies to compare.");
  if (tickers.length > plan.maxCompanies)
    throw new UserError(`The ${plan.name} plan compares up to ${plan.maxCompanies} companies. Upgrade to add more.`, { cause: "upgrade" });
  if (period === "quarterly" && !plan.quarterly)
    throw new UserError("Quarterly data is available on the Standard and Pro plans.", { cause: "upgrade" });

  const loaded = await Promise.all(tickers.map((t) => Promise.all([loadCompany(t), getProfile(t)])));
  const companies: ComparedCompany[] = loaded.map(([c, profile]) => ({
    ticker: c.ticker,
    name: profile?.name ?? c.name,
    profile,
    rows: period === "annual" ? c.annual.slice(-plan.years) : c.quarterly.slice(-plan.quarters),
  }));
  const insights: Insight[] = explain(companies);
  return { period, plan: plan.id, companies, insights };
}

export type ComparePayload = Awaited<ReturnType<typeof compare>>;
