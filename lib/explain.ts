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

/** Companies with a value for `key`, best first. */
function rank(companies: CompanySeries[], key: RatioKey): Ranked {
  const def = RATIO_BY_KEY[key];
  return companies
    .map((c) => ({ ticker: c.ticker, value: latest(c)?.ratios[key] ?? null }))
    .filter((r): r is { ticker: string; value: number } => r.value !== null)
    .sort((a, b) => (def.higherIsBetter ? b.value - a.value : a.value - b.value));
}

/** "A", "A and B", "A, B, and C". */
export function and(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

/** "16.4% for MSFT and 4.2% for AAPL". */
const each = (r: Ranked, fmt: (n: number) => string) => and(r.map((x) => `${fmt(x.value)} for ${x.ticker}`));

/** Comparative for two companies, superlative for three or more. */
const degree = (n: number, comparative: string, superlative: string) => (n > 2 ? superlative : comparative);

const cents = (n: number) => `${Math.round(n * 100)}¢`;
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${fmtPct(Math.abs(n))}`;
const changed = (n: number) => (n >= 0 ? `grew ${fmtPct(n)}` : `shrank ${fmtPct(-n)}`);

export function explain(companies: CompanySeries[]): Insight[] {
  const out: Insight[] = [];
  if (companies.length < 2) return out;

  // Size
  const byRevenue = companies
    .map((c) => ({ ticker: c.ticker, value: latest(c)?.values.revenue ?? null }))
    .filter((r): r is { ticker: string; value: number } => r.value !== null)
    .sort((a, b) => b.value - a.value);
  if (byRevenue.length >= 2) {
    const [big, small] = [byRevenue[0], byRevenue.at(-1)!];
    const ratio = big.value / small.value;
    const lead =
      ratio < 1.15
        ? `${big.ticker} and ${small.ticker} are similar in size, with ${fmtUSD(big.value)} and ${fmtUSD(small.value)} in revenue in their latest fiscal years.`
        : `${big.ticker} is the ${degree(byRevenue.length, "larger", "largest")} company by revenue, with ${fmtUSD(big.value)} in its latest fiscal year, about ${ratio.toFixed(1)}× ${small.ticker}'s ${fmtUSD(small.value)}.`;
    out.push({
      category: "scale",
      title: "Size",
      tone: "neutral",
      text: `${lead} The ratios below adjust for size, so a smaller company can still be more profitable or more efficient.`,
    });
  }

  // Growth
  const g = rank(companies, "revenueGrowth");
  if (g.length >= 2) {
    const [lead, lag] = [g[0], g.at(-1)!];
    let text = `${lead.ticker}'s revenue ${changed(lead.value)} in its latest period, the ${degree(g.length, "faster of the two", "fastest of the group")}, while ${lag.ticker}'s revenue ${changed(lag.value)}.`;

    const cagrs = companies
      .map((c) => {
        const rows = c.rows.filter((r) => r.values.revenue !== null);
        const n = Math.min(3, rows.length - 1);
        return { ticker: c.ticker, value: n > 0 ? cagr(rows.at(-1 - n)!.values.revenue, rows.at(-1)!.values.revenue, n) : null, n };
      })
      .filter((x): x is { ticker: string; value: number; n: number } => x.value !== null);
    if (cagrs.length >= 2) {
      const years = Math.min(...cagrs.map((c) => c.n));
      text += ` Over the past ${years} years, average annual revenue growth (CAGR) was ${each(cagrs, (n) => fmtPct(n))}.`;
    }

    const ahead: string[] = [];
    const behind: string[] = [];
    for (const c of companies) {
      const r = latest(c)?.ratios;
      if (r?.revenueGrowth == null || r.netIncomeGrowth == null) continue;
      const detail = `${c.ticker} (${signed(r.netIncomeGrowth)} vs. ${signed(r.revenueGrowth)})`;
      if (r.netIncomeGrowth - r.revenueGrowth > 0.05) ahead.push(detail);
      else if (r.revenueGrowth - r.netIncomeGrowth > 0.05) behind.push(detail);
    }
    if (ahead.length || behind.length) text += " Comparing net income growth with revenue growth:";
    if (ahead.length)
      text += ` net income outpaced revenue at ${and(ahead)}, which usually means costs are rising more slowly than sales (a sign of operating leverage).`;
    if (behind.length)
      text += `${ahead.length ? " Meanwhile," : ""} net income lagged revenue at ${and(behind)}, which suggests rising costs, higher taxes, or one-time charges are squeezing margins.`;

    out.push({ category: "growth", title: "Revenue & earnings growth", tone: lead.value < 0 ? "caution" : "positive", text });
  }

  // Profitability: margins
  const om = rank(companies, "operatingMargin");
  if (om.length >= 2) {
    const [lead, lag] = [om[0], om.at(-1)!];
    const gap = lead.value - lag.value;
    let text =
      om.length > 2
        ? `${lead.ticker} has the highest operating margin, keeping about ${cents(lead.value)} of operating profit from every dollar of revenue, while ${lag.ticker} has the lowest at ${cents(lag.value)}.`
        : `${lead.ticker} keeps about ${cents(lead.value)} of operating profit from every dollar of revenue, compared with ${cents(lag.value)} for ${lag.ticker}.`;
    text += ` That is a gap of ${(gap * 100).toFixed(1)} percentage points.`;
    text +=
      gap > 0.1
        ? " A gap this large usually points to a different business model (for example, software that costs little to sell one more copy of, versus hardware that is expensive to build) or to stronger pricing power."
        : " The margins are close, which suggests similar cost control at the operating level.";
    const gm = rank(companies, "grossMargin");
    if (gm.length >= 2)
      text += ` Gross margins are ${each(gm, (n) => fmtPct(n))}, which shows how much of the difference comes from the direct cost of making what they sell.`;
    out.push({ category: "profitability", title: "Margins", tone: "neutral", text });
  }

  // Profitability: returns
  const roa = rank(companies, "roa");
  if (roa.length >= 2) {
    let text = `Return on assets is ${each(roa, (n) => fmtPct(n))}, so ${roa[0].ticker} earns ${degree(roa.length, "more", "the most")} profit for each dollar of assets it owns and needs less capital to generate its earnings.`;
    const roe = rank(companies, "roe");
    if (roe.length >= 2) text += ` Return on equity is ${each(roe, (n) => fmtPct(n))}.`;
    const levered = companies.find((c) => (latest(c)?.ratios.equityMultiplier ?? 0) > 3);
    if (levered)
      text += ` ${levered.ticker}'s return on equity is boosted by a high equity multiplier of ${fmtX(latest(levered)!.ratios.equityMultiplier)}. Because ROE = ROA × equity multiplier, a small equity base relative to assets raises ROE even if the business itself is not more productive. For most companies that comes from large share buybacks; for banks, it comes from deposits funding most of the balance sheet.`;
    out.push({ category: "profitability", title: "Returns on capital", tone: "neutral", text });
  }

  // Liquidity
  const cr = rank(companies, "currentRatio");
  if (cr.length >= 2) {
    // Group companies in the same band so each idea is stated once.
    const high = cr.filter((x) => x.value > 2.5);
    const ok = cr.filter((x) => x.value >= 1 && x.value <= 2.5);
    const tight = cr.filter((x) => x.value < 1);
    const names = (r: Ranked) => and(r.map((x) => x.ticker));
    const vals = (r: Ranked) => and(r.map((x) => fmtX(x.value)));
    const parts: string[] = [];
    if (high.length)
      parts.push(
        high.length === 1
          ? `${names(high)} has a very high current ratio of ${vals(high)}, which is conservative and may mean cash is sitting idle.`
          : `${names(high)} have very high current ratios (${vals(high)}), which is conservative and may mean cash is sitting idle.`,
      );
    if (ok.length)
      parts.push(
        ok.length === 1
          ? `${names(ok)} has a comfortable current ratio of ${vals(ok)}.`
          : `${names(ok)} have comfortable current ratios (${vals(ok)}).`,
      );
    if (tight.length)
      parts.push(
        tight.length === 1
          ? `${names(tight)}'s current ratio is ${vals(tight)}, which means its short-term liabilities are larger than its short-term assets.`
          : `${names(tight)} have current ratios below 1 (${vals(tight)}), which means their short-term liabilities are larger than their short-term assets.`,
      );
    let text = parts.join(" ");
    if (tight.length)
      text += ` A ratio below 1 is not necessarily a warning sign for a company with strong, steady cash flow. It may be choosing to run lean and return cash to shareholders, but it has less of a cushion if cash flow weakens.`;
    const qr = rank(companies, "quickRatio");
    if (qr.length >= 2) text += ` Excluding inventory, the quick ratios are ${each(qr, (n) => fmtX(n))}.`;
    out.push({ category: "liquidity", title: "Short-term liquidity", tone: tight.length ? "caution" : "positive", text });
  } else {
    const missing = companies.filter((c) => latest(c)?.ratios.currentRatio == null).map((c) => c.ticker);
    if (missing.length)
      out.push({
        category: "liquidity",
        title: "Short-term liquidity",
        tone: "neutral",
        text: `${and(missing)} ${missing.length > 1 ? "don't" : "doesn't"} report current assets and liabilities separately, which is normal for banks and insurers, so the current ratio can't be compared. The liabilities-to-equity ratio in the scorecard is a better measure for them.`,
      });
  }

  // Leverage
  const de = rank(companies, "debtToEquity");
  if (de.length >= 2) {
    const label = (v: number) => (v < 0.5 ? "conservative" : v <= 1.5 ? "moderate" : "high");
    const text = `Debt-to-equity is ${and(de.map((x) => `${fmtX(x.value)} for ${x.ticker} (${label(x.value)})`))}. ${de[0].ticker} relies ${degree(de.length, "less", "least")} on borrowing, which gives it more flexibility in a downturn. More debt can boost returns to shareholders, but it also adds fixed interest payments and refinancing risk.`;
    out.push({ category: "leverage", title: "Leverage", tone: de.at(-1)!.value > 2 ? "caution" : "neutral", text });
  }
  for (const c of companies) {
    const eq = latest(c)?.values.equity;
    if (eq !== null && eq !== undefined && eq <= 0)
      out.push({
        category: "leverage",
        title: `${c.ticker} has negative equity`,
        tone: "caution",
        text: `${c.ticker}'s shareholders' equity is ${fmtUSD(eq)}, so equity-based ratios such as return on equity and debt-to-equity aren't meaningful. This usually happens when share buybacks exceed accumulated profits rather than because of financial distress, so look at cash flow and interest coverage instead.`,
      });
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
    const scored = keys.filter((k) => rank(companies, k).length >= 2).length;
    const leaders = board.map(([t, n], i) => (i === 0 ? `${t} comes out ahead on ${n}` : `${t} on ${n}`));
    out.push({
      category: "summary",
      title: "Bottom line",
      tone: "neutral",
      text: `Of the ${scored} key ratios compared here, ${and(leaders)}. Keep in mind that ratios describe past results and vary by industry, so compare companies in the same sector and read the notes to the financial statements before drawing conclusions.`,
    });
  }
  return out;
}
