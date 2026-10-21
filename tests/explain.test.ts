import { describe, expect, it } from "vitest";
import { and, explain, type CompanySeries } from "@/lib/explain";
import type { RatioRow, Ratios } from "@/lib/ratios";
import type { Values } from "@/lib/normalize";

const blankValues: Values = {
  revenue: null, grossProfit: null, operatingIncome: null, netIncome: null, operatingCashFlow: null, assets: null,
  currentAssets: null, currentLiabilities: null, liabilities: null, equity: null, debt: null, inventory: null, cash: null,
};
const blankRatios = Object.fromEntries(
  ["revenueGrowth", "netIncomeGrowth", "grossMargin", "operatingMargin", "netMargin", "roa", "roe", "currentRatio", "quickRatio", "cashRatio", "debtToEquity", "debtToAssets", "liabilitiesToEquity", "equityMultiplier"].map((k) => [k, null]),
) as Ratios;

const company = (ticker: string, values: Partial<Values>, ratios: Partial<Ratios>): CompanySeries => ({
  ticker,
  name: ticker,
  rows: [{ label: "FY2025", end: "2025-06-30", fiscalYear: 2025, values: { ...blankValues, ...values }, ratios: { ...blankRatios, ...ratios } } as RatioRow],
});

describe("explain", () => {
  const msft = company("MSFT", { revenue: 280e9, equity: 340e9 }, { operatingMargin: 0.45, grossMargin: 0.69, revenueGrowth: 0.15, roa: 0.18, currentRatio: 1.3, debtToEquity: 0.2 });
  const aapl = company("AAPL", { revenue: 400e9, equity: 60e9 }, { operatingMargin: 0.31, grossMargin: 0.46, revenueGrowth: 0.06, roa: 0.3, currentRatio: 0.87, debtToEquity: 1.6, equityMultiplier: 5.5, roe: 1.5 });
  const insights = explain([msft, aapl]);
  const find = (title: string) => insights.find((i) => i.title === title)!;

  it("names the margin leader and flags a structural gap", () => {
    expect(find("Margins").text).toMatch(/^MSFT keeps about 45¢ of operating profit from every dollar of revenue, compared with 31¢ for AAPL\./);
    expect(find("Margins").text).toMatch(/different business model/);
  });

  it("uses comparatives, not superlatives, for two companies", () => {
    const all = insights.map((i) => i.text).join(" ");
    expect(find("Size").text).toMatch(/^AAPL is the larger company by revenue/);
    expect(find("Revenue & earnings growth").text).toMatch(/the faster of the two/);
    expect(find("Returns on capital").text).toMatch(/AAPL earns more profit/);
    expect(find("Leverage").text).toMatch(/MSFT relies less on borrowing/);
    expect(all).not.toMatch(/\b(largest|fastest|the most|least)\b/);
  });

  it("flags a current ratio below 1 in a full sentence", () => {
    const l = find("Short-term liquidity");
    expect(l.tone).toBe("caution");
    expect(l.text).toMatch(/^MSFT has a comfortable current ratio of 1\.30×\. AAPL's current ratio is 0\.87×, which means its short-term liabilities are larger/);
  });

  it("classifies leverage and explains DuPont amplification", () => {
    expect(find("Leverage").text).toMatch(/0\.20× for MSFT \(conservative\) and 1\.60× for AAPL \(high\)/);
    expect(find("Returns on capital").text).toMatch(/AAPL's return on equity is boosted/);
  });

  it("describes revenue declines as shrinking", () => {
    const down = company("INTC", { revenue: 50e9 }, { revenueGrowth: -0.08 });
    expect(explain([msft, down]).find((i) => i.title === "Revenue & earnings growth")!.text).toMatch(/INTC's revenue shrank 8\.0%/);
  });

  it("joins names naturally for banks without current assets", () => {
    const jpm = company("JPM", { revenue: 180e9 }, {});
    const bac = company("BAC", { revenue: 110e9 }, {});
    expect(explain([jpm, bac]).find((i) => i.title === "Short-term liquidity")!.text).toMatch(/^JPM and BAC don't report/);
  });

  it("writes a bottom line", () => {
    expect(find("Bottom line").text).toMatch(/^Of the 5 key ratios compared here, MSFT comes out ahead on 4 and AAPL on 1\./);
  });

  it("returns nothing for a single company", () => {
    expect(explain([msft])).toEqual([]);
  });
});

describe("and", () => {
  it("joins lists in plain English", () => {
    expect(and(["A"])).toBe("A");
    expect(and(["A", "B"])).toBe("A and B");
    expect(and(["A", "B", "C"])).toBe("A, B, and C");
  });
});
