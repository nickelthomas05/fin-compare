import Link from "next/link";
import { Lock } from "lucide-react";
import { InsightsPanel } from "@/components/InsightsPanel";
import { RatioTable } from "@/components/RatioTable";
import { StatementChart } from "@/components/StatementChart";
import { compare, parseTickers, UserError } from "@/lib/company";
import { fmtPct, fmtUSD } from "@/lib/format";
import { getViewer } from "@/lib/session";
import { PrintButton } from "./PrintButton";

export default async function Report({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { plan } = await getViewer();
  if (!plan.pdfReport)
    return (
      <div className="glass glass-glow mt-1 flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="flex items-center gap-2 text-sm text-muted">
          <Lock className="size-4 text-cyan" /> Printable PDF reports are part of the Pro plan.
        </p>
        <Link href="/pricing" className="btn btn-primary">
          Upgrade to Pro
        </Link>
      </div>
    );

  const tickers = parseTickers(sp.tickers ?? "MSFT,AAPL");
  const period = sp.period === "quarterly" ? "quarterly" : "annual";
  let data;
  try {
    data = await compare(tickers, period, plan);
  } catch (err) {
    if (err instanceof UserError) return <p className="glass p-5 text-sm text-down">{err.message}</p>;
    throw err;
  }

  return (
    <article className="space-y-5 pt-1">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">FinCompare report · {new Date().toLocaleDateString()}</p>
          <h1 className="text-3xl font-bold tracking-tight">{data.companies.map((c) => c.name).join(" vs ")}</h1>
          <p className="mt-1 text-sm text-dim">{period === "annual" ? "Annual" : "Quarterly"} financial statement comparison · Source: SEC EDGAR</p>
        </div>
        <PrintButton />
      </header>

      <section className="glass p-5">
        <h2 className="card-title mb-3">Income statement summary (latest period)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-2 font-medium">Company</th>
              <th className="py-2 text-right font-medium">Period</th>
              <th className="py-2 text-right font-medium">Revenue</th>
              <th className="py-2 text-right font-medium">Net income</th>
              <th className="py-2 text-right font-medium">Revenue growth</th>
              <th className="py-2 text-right font-medium">Total assets</th>
            </tr>
          </thead>
          <tbody>
            {data.companies.map((c) => {
              const r = c.rows.at(-1)!;
              return (
                <tr key={c.ticker} className="border-t border-edge/60">
                  <td className="py-2">{c.ticker} — {c.name}</td>
                  <td className="py-2 text-right text-muted">{r.label}</td>
                  <td className="py-2 text-right tabular-nums">{fmtUSD(r.values.revenue)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtUSD(r.values.netIncome)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtPct(r.ratios.revenueGrowth)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtUSD(r.values.assets)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <StatementChart companies={data.companies} />
      <InsightsPanel insights={data.insights} />
      <RatioTable companies={data.companies} />
    </article>
  );
}
