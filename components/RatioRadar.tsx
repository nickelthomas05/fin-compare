"use client";

import { Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ComparedCompany } from "@/lib/company";
import { fmtRatio } from "@/lib/format";
import { RATIO_BY_KEY, type RatioKey } from "@/lib/ratios";
import { SERIES_COLORS, tooltipStyle } from "./chart-utils";

const AXES: RatioKey[] = ["revenueGrowth", "grossMargin", "operatingMargin", "roa", "currentRatio", "debtToEquity"];

/** Each axis scored 0–100 relative to the best company on it (lower-is-better ratios inverted). */
export function RatioRadar({ companies }: { companies: ComparedCompany[] }) {
  const data = AXES.map((key) => {
    const def = RATIO_BY_KEY[key];
    const vals = companies.map((c) => c.rows.at(-1)?.ratios[key] ?? null);
    const nums = vals.filter((v): v is number => v !== null);
    const max = Math.max(...nums);
    const min = Math.min(...nums);
    const point: Record<string, string | number | null> = { axis: def.label };
    companies.forEach((c, i) => {
      const v = vals[i];
      if (v === null) return (point[c.ticker] = 0);
      const score = def.higherIsBetter ? (max > 0 ? Math.max(v, 0) / max : 0) : v > 0 ? min / v : 1;
      point[c.ticker] = Math.round(Math.max(0.05, Math.min(1, score)) * 100);
      point[`${c.ticker}__raw`] = fmtRatio(v, def.format);
    });
    return point;
  });

  return (
    <section className="glass p-5">
      <header className="mb-2">
        <h2 className="card-title">Financial Profile</h2>
        <p className="label">Relative score per ratio (100 = best in group)</p>
      </header>
      <div className="h-72">
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="rgba(96,140,255,0.15)" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "#8b9cc7", fontSize: 11 }} />
            {companies.map((c, i) => (
              <Radar key={c.ticker} dataKey={c.ticker} stroke={SERIES_COLORS[i]} fill={SERIES_COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
            ))}
            <Tooltip
              {...tooltipStyle}
              formatter={(v, name, item) => [`${item.payload[`${name}__raw`] ?? "n/a"} (score ${v})`, name]}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
