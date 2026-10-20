"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ComparedCompany } from "@/lib/company";
import { fmtUSD } from "@/lib/format";
import { alignByPeriod, axisUSD, SERIES_COLORS, tooltipStyle } from "./chart-utils";

const METRICS = [
  { key: "revenue", label: "Revenue" },
  { key: "netIncome", label: "Net income" },
  { key: "operatingIncome", label: "Operating income" },
] as const;

export function StatementChart({ companies }: { companies: ComparedCompany[] }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("revenue");
  const data = alignByPeriod(companies, (r) => r.values[metric]);

  return (
    <section className="glass p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="card-title">Revenue vs Net Income</h2>
          <p className="label">Reported figures by fiscal period (SEC 10-K / 10-Q)</p>
        </div>
        <div className="flex rounded-xl border border-edge bg-ink-2/70 p-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${metric === m.key ? "bg-blue/30 text-fg shadow-[0_0_14px_-4px_rgba(59,130,246,.8)]" : "text-muted hover:text-fg"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>
      <div className="h-72">
        <ResponsiveContainer>
          <BarChart data={data} barGap={3} barCategoryGap="22%">
            <defs>
              {companies.map((c, i) => (
                <linearGradient key={c.ticker} id={`bar-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES_COLORS[i]} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={SERIES_COLORS[i]} stopOpacity={0.35} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={axisUSD} tickLine={false} axisLine={false} width={56} />
            <Tooltip {...tooltipStyle} formatter={(v) => fmtUSD(v as number)} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            {companies.map((c, i) => (
              <Bar key={c.ticker} dataKey={c.ticker} fill={`url(#bar-${i})`} radius={[6, 6, 0, 0]} maxBarSize={28} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
