"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ComparedCompany } from "@/lib/company";
import { fmtUSD } from "@/lib/format";
import { tooltipStyle } from "./chart-utils";

const PARTS = [
  { key: "debt", label: "Debt", color: "#ff5c7a" },
  { key: "otherLiabilities", label: "Other liabilities", color: "#fbbf24" },
  { key: "equity", label: "Shareholders' equity", color: "#2ee6c5" },
] as const;

/** How each company's assets are funded, as a share of total assets (latest balance sheet). */
export function CapitalStructureChart({ companies }: { companies: ComparedCompany[] }) {
  const negative: string[] = [];
  const data = companies.map((c) => {
    const v = c.rows.at(-1)?.values;
    const assets = v?.assets ?? null;
    const point: Record<string, string | number | null> = { ticker: c.ticker };
    if (!v || !assets || v.liabilities === null) {
      PARTS.forEach((p) => (point[p.key] = null));
      return point;
    }
    const equity = Math.max(v.equity ?? assets - v.liabilities, 0);
    if ((v.equity ?? 0) < 0) negative.push(c.ticker);
    const debt = Math.min(v.debt ?? 0, v.liabilities);
    const total = debt + (v.liabilities - debt) + equity || assets;
    point.debt = Math.round((debt / total) * 1000) / 10;
    point.otherLiabilities = Math.round(((v.liabilities - debt) / total) * 1000) / 10;
    point.equity = Math.round((equity / total) * 1000) / 10;
    point.assets = assets;
    return point;
  });

  return (
    <section className="glass p-5">
      <header className="mb-4">
        <h2 className="card-title">Capital Structure</h2>
        <p className="label">How each dollar of assets is funded · latest balance sheet</p>
      </header>
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" barCategoryGap="28%">
            <CartesianGrid horizontal={false} />
            <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="ticker" tickLine={false} axisLine={false} width={52} />
            <Tooltip
              {...tooltipStyle}
              formatter={(v, name) => [v === null ? "n/a" : `${v}%`, name]}
              labelFormatter={(t, p) => `${t} · total assets ${fmtUSD((p?.[0]?.payload?.assets as number) ?? null)}`}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            {PARTS.map((p, i) => (
              <Bar
                key={p.key}
                dataKey={p.key}
                name={p.label}
                stackId="a"
                fill={p.color}
                fillOpacity={0.8}
                maxBarSize={26}
                radius={i === 0 ? [6, 0, 0, 6] : i === PARTS.length - 1 ? [0, 6, 6, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted">
        More teal means owners fund more of the business; more red means heavier reliance on borrowed money.
        {negative.length > 0 && ` ${negative.join(" and ")} ${negative.length > 1 ? "have" : "has"} negative equity, shown as 0%.`}
      </p>
    </section>
  );
}
