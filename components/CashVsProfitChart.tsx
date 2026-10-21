"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ComparedCompany } from "@/lib/company";
import { div } from "@/lib/ratios";
import { fmtUSD } from "@/lib/format";
import { axisUSD, tooltipStyle } from "./chart-utils";

/** Net income vs operating cash flow: are reported earnings backed by cash? */
export function CashVsProfitChart({ companies }: { companies: ComparedCompany[] }) {
  const data = companies.map((c) => {
    // Latest period that has both figures (10-Q cash flows are year-to-date, so some quarters lack them).
    const row = [...c.rows].reverse().find((r) => r.values.operatingCashFlow !== null && r.values.netIncome !== null);
    return {
      ticker: c.ticker,
      period: row?.label ?? "n/a",
      netIncome: row?.values.netIncome ?? null,
      operatingCashFlow: row?.values.operatingCashFlow ?? null,
      conversion: div(row?.values.operatingCashFlow, row?.values.netIncome),
    };
  });

  return (
    <section className="glass p-5">
      <header className="mb-4">
        <h2 className="card-title">Cash vs. Profit</h2>
        <p className="label">Operating cash flow compared with reported net income</p>
      </header>
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={data} barGap={4} barCategoryGap="30%">
            <defs>
              <linearGradient id="cvp-ni" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b6cff" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#8b6cff" stopOpacity={0.35} />
              </linearGradient>
              <linearGradient id="cvp-ocf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#27c4f5" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#27c4f5" stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="ticker" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={axisUSD} tickLine={false} axisLine={false} width={56} />
            <Tooltip {...tooltipStyle} formatter={(v) => fmtUSD(v as number)} labelFormatter={(t, p) => `${t} · ${p?.[0]?.payload?.period ?? ""}`} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="netIncome" name="Net income" fill="url(#cvp-ni)" radius={[6, 6, 0, 0]} maxBarSize={34} isAnimationActive={false} />
            <Bar dataKey="operatingCashFlow" name="Operating cash flow" fill="url(#cvp-ocf)" radius={[6, 6, 0, 0]} maxBarSize={34} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {data.map((d) => (
          <span key={d.ticker} className="chip" title="Operating cash flow ÷ net income">
            <span className="text-fg">{d.ticker}</span>
            {d.conversion === null ? "n/a" : `${d.conversion.toFixed(2)}× cash conversion`}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        Above 1× means the company collects more cash than it reports as profit, a sign of high-quality earnings. Well below 1× can mean profits are tied up in receivables or inventory.
        {data.some((d) => d.conversion !== null && (d.conversion < 0 || d.conversion > 3)) &&
          " Extreme values (negative or above 3×) usually mean deposits, loans, or trading flow through operating cash flow, as at banks, so this measure says little about earnings quality for them."}
      </p>
    </section>
  );
}
