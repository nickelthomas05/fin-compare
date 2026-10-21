import "server-only";

export type Profile = {
  name?: string;
  logo?: string;
  industry?: string;
  exchange?: string;
  marketCap?: number;
  weburl?: string;
  price?: number;
  changePct?: number;
};

const BASE = "https://finnhub.io/api/v1";

/** Company profile + quote from Finnhub. Returns null when no key is configured or the call fails. */
export async function getProfile(ticker: string): Promise<Profile | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  const get = async (path: string) => {
    const res = await fetch(`${BASE}${path}${path.includes("?") ? "&" : "?"}token=${key}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok ? res.json() : null;
  };
  try {
    const [p, q] = await Promise.all([get(`/stock/profile2?symbol=${encodeURIComponent(ticker)}`), get(`/quote?symbol=${encodeURIComponent(ticker)}`)]);
    if (!p || !p.name) return null;
    return {
      name: p.name,
      logo: p.logo || undefined,
      industry: p.finnhubIndustry,
      exchange: p.exchange,
      marketCap: typeof p.marketCapitalization === "number" ? p.marketCapitalization * 1e6 : undefined,
      weburl: p.weburl,
      price: q?.c || undefined,
      changePct: q?.dp ?? undefined,
    };
  } catch {
    return null;
  }
}
