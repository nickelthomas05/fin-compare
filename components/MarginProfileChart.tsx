"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ComparedCompany } from "@/lib/company";
import { fmtPct } from "@/lib/format";
import { SERIES_COLORS, tooltipStyle } from "./chart-utils";

const STAGES = [
  { key: "grossMargin", label: "Gross margin", hint: "after cost of goods" },
  { key: "operatingMargin", label: "Operating margin", hint: "after R&D, SG&A" },
  { key: "netMargin", label: "Net margin", hint: "after interest & tax" },
] as const;

/** Gross → operating → net margin per company: where each one's revenue gets consumed. */
export function MarginProfileChart({ companies }: { companies: ComparedCompany[] }) {
  const data = STAGES.map((s) => {
    const point: Record<string, string | number | null> = { stage: s.label };
    for (const c of companies) {
      const v = c.rows.at(-1)?.ratios[s.key];
      point[c.ticker] = v === null || v === undefined ? null : Math.round(v * 1000) / 10;
    }
    return point;
  });

  return (
    <section className="glass p-5">
      <header className="mb-4">
        <h2 className="card-title">Margin Profile</h2>
        <p className="label">Cents kept from each revenue dollar at each stage · latest period</p>
      </header>
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" barGap={3} barCategoryGap="24%" margin={{ right: 36 }}>
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              domain={[0, (max: number) => Math.min(100, Math.ceil(max / 20) * 20)]}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={false}
            />
            <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} width={104} />
            <Tooltip {...tooltipStyle} formatter={(v) => (v === null ? "n/a" : fmtPct((v as number) / 100))} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            {companies.map((c, i) => (
              <Bar key={c.ticker} dataKey={c.ticker} fill={SERIES_COLORS[i]} fillOpacity={0.85} radius={[0, 6, 6, 0]} maxBarSize={16} isAnimationActive={false}>
                <LabelList dataKey={c.ticker} position="right" formatter={(v: unknown) => (v == null ? "" : `${v}%`)} style={{ fill: "#8b9cc7", fontSize: 10 }} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted">
        The drop between bars shows where revenue goes: production costs (gross), operating expenses like R&amp;D and marketing (operating), then interest and taxes (net).
      </p>
    </section>
  );
}
