"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ComparedCompany } from "@/lib/company";
import { fmtRatio } from "@/lib/format";
import { RATIO_BY_KEY, RATIOS, type RatioKey } from "@/lib/ratios";
import { alignByPeriod, SERIES_COLORS, tooltipStyle } from "./chart-utils";

export function RatioTrendChart({ companies, allRatios }: { companies: ComparedCompany[]; allRatios: boolean }) {
  const [key, setKey] = useState<RatioKey>("operatingMargin");
  const def = RATIO_BY_KEY[key];
  const data = alignByPeriod(companies, (r) => r.ratios[key]);
  const tick = (v: number) => (def.format === "pct" ? `${Math.round(v * 100)}%` : `${v.toFixed(1)}×`);

  return (
    <section className="glass p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="card-title">Ratio Trends</h2>
          <p className="label">{def.formula}</p>
        </div>
        <select
          value={key}
          onChange={(e) => setKey(e.target.value as RatioKey)}
          className="input w-auto py-1.5 text-xs"
          aria-label="Ratio"
        >
          {(["growth", "profitability", "liquidity", "leverage"] as const).map((cat) => (
            <optgroup key={cat} label={cat[0].toUpperCase() + cat.slice(1)}>
              {RATIOS.filter((r) => r.category === cat).map((r) => (
                <option key={r.key} value={r.key} disabled={!allRatios && !r.core}>
                  {r.label}
                  {!allRatios && !r.core ? " (Pro)" : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </header>
      <div className="h-72">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              {companies.map((c, i) => (
                <linearGradient key={c.ticker} id={`area-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES_COLORS[i]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={SERIES_COLORS[i]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickFormatter={tick} tickLine={false} axisLine={false} width={48} />
            <Tooltip {...tooltipStyle} formatter={(v) => fmtRatio(v as number, def.format)} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            {companies.map((c, i) => (
              <Area
                key={c.ticker}
                type="monotone"
                dataKey={c.ticker}
                stroke={SERIES_COLORS[i]}
                strokeWidth={2.5}
                fill={`url(#area-${i})`}
                connectNulls
                isAnimationActive={false}
                dot={{ r: 2.5, strokeWidth: 0, fill: SERIES_COLORS[i] }}
                activeDot={{ r: 5, stroke: "#050b1a", strokeWidth: 2 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted">{def.meaning}</p>
      {!allRatios && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-dim">
          <Lock className="size-3" /> 9 more ratio trends on{" "}
          <Link href="/pricing" className="text-cyan hover:underline">
            Pro
          </Link>
        </p>
      )}
    </section>
  );
}
