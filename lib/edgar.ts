import "server-only";
import type { CompanyFacts } from "./normalize";

const UA = process.env.SEC_USER_AGENT || "FinCompare student-project contact@example.com";
const TTL_MS = 6 * 60 * 60 * 1000;

// companyfacts payloads are several MB — above Next's 2MB fetch-cache limit — so cache in memory.
const memo = new Map<string, { at: number; value: unknown }>();

async function secJson<T>(url: string): Promise<T> {
  const hit = memo.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  // Time out instead of hanging the request if SEC is slow or unreachable.
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`SEC request failed (${res.status}) for ${url}`);
  const value = (await res.json()) as T;
  memo.set(url, { at: Date.now(), value });
  if (memo.size > 40) memo.delete(memo.keys().next().value!);
  return value;
}

export type TickerEntry = { ticker: string; cik: number; name: string };

export async function getTickers(): Promise<TickerEntry[]> {
  const raw = await secJson<Record<string, { cik_str: number; ticker: string; title: string }>>(
    "https://www.sec.gov/files/company_tickers.json",
  );
  return Object.values(raw).map((r) => ({ ticker: r.ticker.toUpperCase(), cik: r.cik_str, name: r.title }));
}

export async function findTicker(ticker: string): Promise<TickerEntry | null> {
  const t = ticker.trim().toUpperCase();
  return (await getTickers()).find((e) => e.ticker === t) ?? null;
}

export async function getCompanyFacts(cik: number): Promise<CompanyFacts> {
  return secJson<CompanyFacts>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, "0")}.json`);
}
