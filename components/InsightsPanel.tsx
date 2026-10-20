import { AlertTriangle, Lightbulb, Scale, Sparkles, TrendingUp, Wallet, Landmark, Percent } from "lucide-react";
import type { Insight } from "@/lib/explain";

const ICONS = {
  scale: Scale,
  growth: TrendingUp,
  profitability: Percent,
  liquidity: Wallet,
  leverage: Landmark,
  summary: Sparkles,
} as const;

const TONE = {
  positive: "text-up bg-up/10 ring-up/30",
  neutral: "text-cyan bg-cyan/10 ring-cyan/30",
  caution: "text-warn bg-warn/10 ring-warn/30",
};

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <section className="glass p-5">
      <header className="mb-4 flex items-center gap-2">
        <Lightbulb className="size-4 text-cyan" />
        <h2 className="card-title">What the differences mean</h2>
      </header>
      {insights.length === 0 ? (
        <p className="text-sm text-muted">Select at least two companies with reported financials to see an analysis.</p>
      ) : (
        <ul className="space-y-3">
          {insights.map((ins, i) => {
            const Icon = ins.tone === "caution" ? AlertTriangle : ICONS[ins.category];
            return (
              <li key={i} className="flex gap-3 rounded-xl border border-edge/70 bg-ink-2/40 p-3.5">
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg ring-1 ${TONE[ins.tone]}`}>
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{ins.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{ins.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
