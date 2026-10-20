import { describe, expect, it } from "vitest";
import { annualRows } from "@/lib/normalize";
import { cagr, div, withRatios } from "@/lib/ratios";
import { facts } from "./fixtures";

describe("withRatios", () => {
  const rows = withRatios(annualRows(facts), "annual");
  const r = rows[2].ratios;

  it("computes profitability ratios", () => {
    expect(r.grossMargin).toBeCloseTo(54 / 120);
    expect(r.operatingMargin).toBeCloseTo(0.3);
    expect(r.netMargin).toBeCloseTo(0.25);
    expect(r.roa).toBeCloseTo(30 / 250); // average assets (200 + 300) / 2
    expect(r.roe).toBeCloseTo(30 / 60);
  });

  it("computes liquidity ratios", () => {
    expect(r.currentRatio).toBeCloseTo(0.9);
    expect(r.quickRatio).toBeCloseTo(0.8);
    expect(r.cashRatio).toBeNull();
  });

  it("computes leverage ratios", () => {
    expect(r.debtToEquity).toBeCloseTo(48 / 70);
    expect(r.debtToAssets).toBeCloseTo(48 / 300);
    expect(r.liabilitiesToEquity).toBeCloseTo(230 / 70);
    expect(r.equityMultiplier).toBeCloseTo(250 / 60);
  });

  it("computes growth against the prior year", () => {
    expect(r.revenueGrowth).toBeCloseTo(120 / 101 - 1);
    expect(r.netIncomeGrowth).toBeCloseTo(0.5);
    expect(rows[0].ratios.revenueGrowth).toBeNull();
  });

  it("returns null for equity ratios when equity is negative", () => {
    const neg = withRatios(
      [{ ...rows[2], values: { ...rows[2].values, equity: -5 } }],
      "annual",
    )[0].ratios;
    expect(neg.debtToEquity).toBeNull();
    expect(neg.roe).toBeNull();
  });
});

describe("helpers", () => {
  it("div guards against missing and zero denominators", () => {
    expect(div(1, 0)).toBeNull();
    expect(div(null, 2)).toBeNull();
    expect(div(1, 4)).toBe(0.25);
  });

  it("cagr", () => {
    expect(cagr(100, 121, 2)).toBeCloseTo(0.1);
    expect(cagr(-1, 10, 2)).toBeNull();
  });
});
