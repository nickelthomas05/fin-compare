import { describe, expect, it } from "vitest";
import { explain, type CompanySeries } from "@/lib/explain";
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
    expect(find("Margins").text).toMatch(/^MSFT keeps 45¢/);
    expect(find("Margins").text).toMatch(/structurally different business model/);
  });

  it("flags a current ratio below 1 as a caution", () => {
    const l = find("Short-term liquidity");
    expect(l.tone).toBe("caution");
    expect(l.text).toMatch(/AAPL 0.87×.*below 1.0/);
  });

  it("classifies leverage and explains DuPont amplification", () => {
    expect(find("Leverage").text).toMatch(/MSFT 0.20× \(conservatively financed\).*AAPL 1.60× \(highly leveraged\)/);
    expect(find("Returns on capital").text).toMatch(/AAPL's ROE is amplified/);
  });

  it("reports relative size and a bottom line", () => {
    expect(find("Size").text).toMatch(/AAPL is the largest by revenue/);
    expect(find("Bottom line").text).toMatch(/MSFT leads on/);
  });

  it("returns nothing for a single company", () => {
    expect(explain([msft])).toEqual([]);
  });
});
