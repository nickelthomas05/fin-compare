"use client";

import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ComparedCompany } from "@/lib/company";
import { alignByPeriod, SERIES_COLORS, tooltipStyle } from "./chart-utils";

const METRICS = [
  { key: "revenue", label: "Revenue" },
  { key: "netIncome", label: "Net income" },
] as const;

/** Each company's series rebased to 100 at its first period, so growth is comparable regardless of size. */
export function GrowthIndexChart({ companies }: { companies: ComparedCompany[] }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("revenue");
  // Quarterly figures are seasonal (e.g. Apple's holiday quarter), so index trailing-twelve-month totals instead.
  const quarterly = companies.some((c) => c.rows[0]?.quarter !== undefined);
  const ttm = new Map<string, number | null>();
  for (const c of companies)
    c.rows.forEach((r, i) => {
      const window = c.rows.slice(Math.max(0, i - 3), i + 1).map((x) => x.values[metric]);
      ttm.set(`${c.ticker}|${r.label}`, window.length === 4 && window.every((v) => v !== null) ? window.reduce((s, v) => s + v!, 0) : null);
    });
  const valueOf = (ticker: string, r: ComparedCompany["rows"][number]) => (quarterly ? ttm.get(`${ticker}|${r.label}`) ?? null : r.values[metric]);
  const aligned = alignByPeriod(companies, (r) => r).map((p) => {
    const out: Record<string, string | number | null> = { label: p.label as string };
    for (const c of companies) out[c.ticker] = p[c.ticker] ? valueOf(c.ticker, p[c.ticker] as ComparedCompany["rows"][number]) : null;
    return out;
  });
  // Rebase everyone to the first period where all companies report a positive value, so "since X" means the same period for each.
  const baseIdx = aligned.findIndex((p) => companies.every((c) => ((p[c.ticker] as number | null) ?? 0) > 0));
  const basePoint = baseIdx >= 0 ? aligned[baseIdx] : null;
  const data = (baseIdx >= 0 ? aligned.slice(baseIdx) : []).map((point) => {
    const out: Record<string, string | number | null> = { label: point.label as string };
    for (const c of companies) {
      const v = point[c.ticker] as number | null;
      const base = basePoint?.[c.ticker] as number | null;
      out[c.ticker] = v !== null && base ? Math.round((v / base) * 1000) / 10 : null;
    }
    return out;
  });
  const latest = companies.map((c, i) => {
    const last = [...data].reverse().find((d) => d[c.ticker] !== null)?.[c.ticker] as number | undefined;
    return { ticker: c.ticker, color: SERIES_COLORS[i], change: last !== undefined ? last - 100 : null };
  });

  return (
    <section className="glass p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="card-title">Growth Index</h2>
          <p className="label">
            {data[0] ? `${data[0].label} = 100` : "First shared period = 100"}
            {quarterly ? " · trailing 12 months, removes seasonality and size" : " · removes size so growth is comparable"}
          </p>
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
      {data.length < 2 ? (
        <p className="grid h-60 place-items-center px-6 text-center text-sm text-muted">
          These companies don&apos;t share enough periods with reported {metric === "revenue" ? "revenue" : "net income"} to index their growth. Try annual data or the other metric.
        </p>
      ) : (
      <div className="h-60">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={40} domain={["auto", "auto"]} />
            <ReferenceLine y={100} stroke="rgba(139,156,199,0.35)" strokeDasharray="4 4" />
            <Tooltip {...tooltipStyle} formatter={(v) => (v === null ? "n/a" : `${v}`)} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            {companies.map((c, i) => (
              <Line
                key={c.ticker}
                type="monotone"
                dataKey={c.ticker}
                stroke={SERIES_COLORS[i]}
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0, fill: SERIES_COLORS[i] }}
                activeDot={{ r: 5, stroke: "#050b1a", strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {data.length >= 2 && latest.map((l) => (
          <span key={l.ticker} className="chip">
            <span className="size-2 rounded-full" style={{ background: l.color }} />
            <span className="text-fg">{l.ticker}</span>
            {l.change === null ? "n/a" : `${l.change >= 0 ? "+" : ""}${l.change.toFixed(0)}% since ${data[0]?.label}`}
          </span>
        ))}
      </div>
    </section>
  );
}
