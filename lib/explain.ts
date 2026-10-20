// Rule-based narratives that explain what the ratio differences mean financially.
import { fmtPct, fmtUSD, fmtX } from "./format";
import { cagr, RATIO_BY_KEY, type Category, type RatioKey, type RatioRow } from "./ratios";

export type CompanySeries = { ticker: string; name: string; rows: RatioRow[] };

export type Insight = {
  category: Category | "scale" | "summary";
  title: string;
  text: string;
  tone: "positive" | "neutral" | "caution";
};

type Ranked = { ticker: string; value: number }[];

function latest(c: CompanySeries) {
  return c.rows.at(-1);
}

function rank(companies: CompanySeries[], key: RatioKey): Ranked {
  const def = RATIO_BY_KEY[key];
  return companies
    .map((c) => ({ ticker: c.ticker, value: latest(c)?.ratios[key] ?? null }))
    .filter((r): r is { ticker: string; value: number } => r.value !== null)
    .sort((a, b) => (def.higherIsBetter ? b.value - a.value : a.value - b.value));
}

const pp = (a: number, b: number) => `${Math.abs((a - b) * 100).toFixed(1)} percentage points`;
const list = (r: Ranked, fmt: (n: number) => string) => r.map((x) => `${x.ticker} ${fmt(x.value)}`).join(", ");

export function explain(companies: CompanySeries[]): Insight[] {
  const out: Insight[] = [];
  if (companies.length < 2) return out;

  // Scale
  const byRevenue = companies
    .map((c) => ({ ticker: c.ticker, value: latest(c)?.values.revenue ?? null }))
    .filter((r): r is { ticker: string; value: number } => r.value !== null)
    .sort((a, b) => b.value - a.value);
  if (byRevenue.length >= 2) {
    const [big, small] = [byRevenue[0], byRevenue.at(-1)!];
    out.push({
      category: "scale",
      title: "Size",
      tone: "neutral",
      text: `${big.ticker} is the largest by revenue (${fmtUSD(big.value)}), ${(big.value / small.value).toFixed(1)}× ${small.ticker}'s ${fmtUSD(small.value)}. Ratios below normalize for size, so a smaller company can still be the more profitable or efficient one.`,
    });
  }

  // Growth
  const g = rank(companies, "revenueGrowth");
  if (g.length >= 2) {
    const [lead, lag] = [g[0], g.at(-1)!];
    const cagrs = companies
      .map((c) => {
        const rows = c.rows.filter((r) => r.values.revenue !== null);
        const n = Math.min(3, rows.length - 1);
        return { ticker: c.ticker, value: n > 0 ? cagr(rows.at(-1 - n)!.values.revenue, rows.at(-1)!.values.revenue, n) : null, n };
      })
      .filter((x) => x.value !== null);
    let text = `${lead.ticker} grew revenue fastest in the latest period (${fmtPct(lead.value)}) versus ${lag.ticker} at ${fmtPct(lag.value)}.`;
    if (cagrs.length >= 2) text += ` Over the last ${cagrs[0].n} years, compound annual revenue growth was ${cagrs.map((c) => `${c.ticker} ${fmtPct(c.value)}`).join(", ")}.`;
    for (const c of companies) {
      const r = latest(c)?.ratios;
      if (r?.revenueGrowth != null && r.netIncomeGrowth != null && Math.abs(r.netIncomeGrowth - r.revenueGrowth) > 0.05) {
        text +=
          r.netIncomeGrowth > r.revenueGrowth
            ? ` ${c.ticker}'s profit grew faster than its sales (${fmtPct(r.netIncomeGrowth)} vs ${fmtPct(r.revenueGrowth)}), a sign of operating leverage — costs are rising more slowly than revenue.`
            : ` ${c.ticker}'s profit lagged its sales growth (${fmtPct(r.netIncomeGrowth)} vs ${fmtPct(r.revenueGrowth)}), suggesting rising costs, taxes or one-time charges are compressing margins.`;
      }
    }
    out.push({ category: "growth", title: "Revenue & earnings growth", tone: lead.value < 0 ? "caution" : "positive", text });
  }

  // Profitability
  const om = rank(companies, "operatingMargin");
  if (om.length >= 2) {
    const [lead, lag] = [om[0], om.at(-1)!];
    const gap = lead.value - lag.value;
    let text = `${lead.ticker} keeps ${Math.round(lead.value * 100)}¢ of operating profit from each revenue dollar versus ${Math.round(lag.value * 100)}¢ for ${lag.ticker} (${pp(lead.value, lag.value)} apart).`;
    text +=
      gap > 0.1
        ? " A gap this large usually reflects a structurally different business model — for example software and services with low incremental cost versus hardware with significant manufacturing costs — or stronger pricing power."
        : " The margins are close, so the companies have broadly similar cost discipline at the operating level.";
    const gm = rank(companies, "grossMargin");
    if (gm.length >= 2) text += ` Gross margins (${list(gm, (n) => fmtPct(n))}) show how much of that difference starts with direct product costs.`;
    out.push({ category: "profitability", title: "Margins", tone: "neutral", text });
  }
  const roa = rank(companies, "roa");
  if (roa.length >= 2) {
    const roe = rank(companies, "roe");
    let text = `Return on assets: ${list(roa, (n) => fmtPct(n))}. ${roa[0].ticker} generates the most profit per dollar of assets, meaning it needs less capital to produce earnings.`;
    if (roe.length >= 2) text += ` Return on equity: ${list(roe, (n) => fmtPct(n))}.`;
    const levered = companies.find((c) => (latest(c)?.ratios.equityMultiplier ?? 0) > 3);
    if (levered)
      text += ` ${levered.ticker}'s ROE is amplified by a high equity multiplier (${fmtX(latest(levered)!.ratios.equityMultiplier)}): per the DuPont identity ROE = ROA × leverage, so a thin equity base — often from large buybacks — lifts ROE without the business being more productive.`;
    out.push({ category: "profitability", title: "Returns on capital", tone: "neutral", text });
  }

  // Liquidity
  const cr = rank(companies, "currentRatio");
  if (cr.length >= 2) {
    const parts = cr.map((x) => {
      const state = x.value < 1 ? "below 1.0 (current liabilities exceed current assets)" : x.value > 2.5 ? "very conservative, possibly holding idle cash" : "a comfortable buffer";
      return `${x.ticker} ${fmtX(x.value)} — ${state}`;
    });
    let text = `Current ratio: ${parts.join("; ")}.`;
    const tight = cr.filter((x) => x.value < 1);
    if (tight.length)
      text += ` A ratio under 1 isn't automatically a red flag for a company with strong, predictable operating cash flow — it may be choosing to run lean and return cash to shareholders — but it leaves less cushion if cash flow weakens.`;
    const qr = rank(companies, "quickRatio");
    if (qr.length >= 2) text += ` Excluding inventory, quick ratios are ${list(qr, (n) => fmtX(n))}.`;
    out.push({ category: "liquidity", title: "Short-term liquidity", tone: tight.length ? "caution" : "positive", text });
  } else {
    const missing = companies.filter((c) => latest(c)?.ratios.currentRatio == null).map((c) => c.ticker);
    if (missing.length)
      out.push({ category: "liquidity", title: "Short-term liquidity", tone: "neutral", text: `${missing.join(", ")} ${missing.length > 1 ? "do" : "does"} not report a classified balance sheet (common for banks and insurers), so current-ratio comparisons aren't meaningful. Use liabilities-to-equity instead.` });
  }

  // Leverage
  const de = rank(companies, "debtToEquity");
  if (de.length >= 2) {
    const parts = de.map((x) => {
      const state = x.value < 0.5 ? "conservatively financed" : x.value <= 1.5 ? "moderately leveraged" : "highly leveraged";
      return `${x.ticker} ${fmtX(x.value)} (${state})`;
    });
    const text = `Debt-to-equity: ${parts.join(", ")}. ${de[0].ticker} relies least on borrowing, giving it more flexibility in a downturn; higher leverage can boost returns to shareholders but adds fixed interest obligations and refinancing risk.`;
    out.push({ category: "leverage", title: "Leverage", tone: de.at(-1)!.value > 2 ? "caution" : "neutral", text });
  }
  for (const c of companies) {
    const eq = latest(c)?.values.equity;
    if (eq !== null && eq !== undefined && eq <= 0)
      out.push({ category: "leverage", title: `${c.ticker} has negative equity`, tone: "caution", text: `${c.ticker}'s shareholders' equity is ${fmtUSD(eq)}, so equity-based ratios (ROE, debt-to-equity) are not meaningful. This often results from buybacks exceeding retained earnings rather than distress — check cash flow and interest coverage.` });
  }

  // Summary scorecard
  const wins = new Map<string, number>();
  const keys: RatioKey[] = ["revenueGrowth", "operatingMargin", "netMargin", "roa", "currentRatio", "debtToEquity"];
  for (const k of keys) {
    const r = rank(companies, k);
    if (r.length >= 2) wins.set(r[0].ticker, (wins.get(r[0].ticker) ?? 0) + 1);
  }
  const board = [...wins.entries()].sort((a, b) => b[1] - a[1]);
  if (board.length) {
    out.push({
      category: "summary",
      title: "Bottom line",
      tone: "neutral",
      text: `Across ${keys.length} headline ratios, ${board.map(([t, n]) => `${t} leads on ${n}`).join(", ")}. Ratios describe the past and differ by industry — compare companies within the same sector and read the notes to the financial statements before drawing conclusions.`,
    });
  }
  return out;
}
