import type { ComparedCompany } from "@/lib/company";
import type { RatioRow } from "@/lib/ratios";

export const SERIES_COLORS = ["#2ee6c5", "#8b6cff", "#27c4f5", "#fbbf24", "#f472b6", "#a3e635"];

export const tooltipStyle = {
  contentStyle: {
    background: "rgba(10, 20, 48, 0.95)",
    border: "1px solid rgba(96,160,255,0.35)",
    borderRadius: 12,
    boxShadow: "0 0 24px -8px rgba(59,130,246,0.6)",
    fontSize: 12,
  },
  labelStyle: { color: "#e8eeff", fontWeight: 600, marginBottom: 4 },
  itemStyle: { padding: 0 },
  cursor: { stroke: "rgba(96,160,255,0.35)", fill: "rgba(96,160,255,0.06)" },
};

/** Aligns each company's rows on period labels (FY2025, FY25 Q1, …) for multi-series charts. */
export function alignByPeriod<T>(companies: ComparedCompany[], pick: (r: RatioRow) => T) {
  const order = new Map<string, number>();
  for (const c of companies) for (const r of c.rows) order.set(r.label, r.fiscalYear * 10 + (r.quarter ?? 0));
  const labels = [...order.keys()].sort((a, b) => order.get(a)! - order.get(b)!);
  return labels.map((label) => {
    const point: Record<string, string | T | null> = { label };
    for (const c of companies) {
      const row = c.rows.find((r) => r.label === label);
      point[c.ticker] = row ? pick(row) : null;
    }
    return point;
  });
}

export const axisUSD = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (a >= 1e9) return `$${(v / 1e9).toFixed(0)}B`;
  if (a >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v}`;
};
