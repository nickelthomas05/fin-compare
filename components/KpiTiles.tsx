"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import type { ComparedCompany } from "@/lib/company";
import { fmtPct, fmtUSD } from "@/lib/format";
import { SERIES_COLORS } from "./chart-utils";

export function KpiTiles({ companies }: { companies: ComparedCompany[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
      {companies.map((c, i) => {
        const color = SERIES_COLORS[i];
        const last = c.rows.at(-1);
        const growth = last?.ratios.revenueGrowth ?? null;
        const spark = c.rows.map((r) => ({ v: r.values.revenue }));
        return (
          <div key={c.ticker} className={`glass relative overflow-hidden p-4 ${i === 0 ? "glass-glow" : ""}`}>
            <div className="flex items-start gap-3">
              {c.profile?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.profile.logo} alt="" className="size-10 rounded-xl bg-white object-contain p-1" />
              ) : (
                <span
                  className="grid size-10 place-items-center rounded-xl text-sm font-bold"
                  style={{ background: `${color}22`, color, boxShadow: `inset 0 0 0 1px ${color}55` }}
                >
                  {c.ticker.slice(0, 2)}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs text-muted">
                  {c.ticker} · {c.profile?.industry ?? c.name}
                </p>
                <p className="text-2xl font-semibold tracking-tight">{fmtUSD(last?.values.revenue)}</p>
                <p className="text-[11px] text-dim">Revenue · {last?.label}</p>
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div className="space-y-1 text-xs">
                <p className={`flex items-center gap-1 font-medium ${growth === null ? "text-muted" : growth >= 0 ? "text-up" : "text-down"}`}>
                  {growth !== null && (growth >= 0 ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />)}
                  {fmtPct(growth)} <span className="font-normal text-dim">YoY</span>
                </p>
                <p className="text-muted">
                  Net margin <span className="text-fg">{fmtPct(last?.ratios.netMargin)}</span>
                </p>
                {c.profile?.marketCap && <p className="text-muted">Mkt cap <span className="text-fg">{fmtUSD(c.profile.marketCap)}</span></p>}
              </div>
              <div className="h-14 w-28">
                <ResponsiveContainer>
                  <AreaChart data={spark}>
                    <defs>
                      <linearGradient id={`spark-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <YAxis hide domain={["dataMin", "dataMax"]} />
                    <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#spark-${i})`} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
