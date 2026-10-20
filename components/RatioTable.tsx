import type { ComparedCompany } from "@/lib/company";
import { fmtRatio } from "@/lib/format";
import { RATIOS, type Category } from "@/lib/ratios";
import { SERIES_COLORS } from "./chart-utils";

const CATS: { key: Category; label: string }[] = [
  { key: "growth", label: "Growth" },
  { key: "profitability", label: "Profitability" },
  { key: "liquidity", label: "Liquidity" },
  { key: "leverage", label: "Leverage" },
];

export function RatioTable({ companies }: { companies: ComparedCompany[] }) {
  return (
    <section className="glass p-5">
      <header className="mb-3">
        <h2 className="card-title">Ratio Scorecard</h2>
        <p className="label">Latest period · best value highlighted</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-2 pr-4 font-medium">Ratio</th>
              {companies.map((c, i) => (
                <th key={c.ticker} className="px-3 py-2 text-right font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: SERIES_COLORS[i] }} />
                    {c.ticker} <span className="text-dim">{c.rows.at(-1)?.label}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {CATS.map((cat) => (
            <tbody key={cat.key}>
              <tr>
                <td colSpan={companies.length + 1} className="pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-cyan/80">
                  {cat.label}
                </td>
              </tr>
              {RATIOS.filter((r) => r.category === cat.key).map((r) => {
                const vals = companies.map((c) => c.rows.at(-1)?.ratios[r.key] ?? null);
                const valid = vals.filter((v): v is number => v !== null);
                const best = valid.length > 1 ? (r.higherIsBetter ? Math.max(...valid) : Math.min(...valid)) : null;
                return (
                  <tr key={r.key} className="border-t border-edge/60" title={`${r.formula} — ${r.meaning}`}>
                    <td className="py-2 pr-4 text-muted">{r.label}</td>
                    {vals.map((v, i) => (
                      <td key={i} className="px-3 py-2 text-right tabular-nums">
                        <span
                          className={
                            v !== null && v === best
                              ? "rounded-md bg-teal/15 px-2 py-0.5 font-semibold text-teal ring-1 ring-teal/30"
                              : v === null
                                ? "text-dim"
                                : ""
                          }
                        >
                          {fmtRatio(v, r.format)}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}
