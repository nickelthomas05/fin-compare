import { describe, expect, it } from "vitest";
import { annualRows, fiscalYearOf, quarterlyRows } from "@/lib/normalize";
import { facts } from "./fixtures";

describe("annualRows", () => {
  const rows = annualRows(facts);

  it("builds one row per fiscal year, oldest first", () => {
    expect(rows.map((r) => r.label)).toEqual(["FY2023", "FY2024", "FY2025"]);
  });

  it("falls back to older revenue tags and keeps the latest filing", () => {
    expect(rows[0].values.revenue).toBe(80);
    expect(rows[1].values.revenue).toBe(101);
  });

  it("ignores quarterly durations reported inside a 10-K", () => {
    expect(rows[2].values.revenue).toBe(120);
  });

  it("derives gross profit, liabilities and total debt", () => {
    const v = rows[2].values;
    expect(v.grossProfit).toBe(54);
    expect(v.liabilities).toBe(230);
    expect(v.debt).toBe(48);
  });
});

describe("quarterlyRows", () => {
  const q = quarterlyRows(facts);

  it("derives Q4 as full year minus Q1–Q3 and skips YTD durations", () => {
    expect(q.slice(0, 4).map((r) => r.label)).toEqual(["FY25 Q1", "FY25 Q2", "FY25 Q3", "FY25 Q4"]);
    expect(q.slice(0, 4).map((r) => r.values.revenue)).toEqual([25, 30, 32, 33]);
    expect(q[3].values.netIncome).toBe(9);
  });

  it("includes quarters of a fiscal year with no 10-K yet", () => {
    expect(q[4]).toMatchObject({ label: "FY26 Q1", fiscalYear: 2026, values: { revenue: 40 } });
  });
});

describe("fiscalYearOf", () => {
  it("assigns January year-ends to the prior fiscal year", () => {
    expect(fiscalYearOf("2025-01-31")).toBe(2024);
    expect(fiscalYearOf("2025-06-30")).toBe(2025);
  });
});
