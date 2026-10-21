"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, CalendarRange, Download, FileText, Loader2, Lock, Info } from "lucide-react";
import type { ComparePayload } from "@/lib/company";
import type { Plan } from "@/lib/plans";
import { CapitalStructureChart } from "./CapitalStructureChart";
import { CashVsProfitChart } from "./CashVsProfitChart";
import { CompanyPicker } from "./CompanyPicker";
import { GrowthIndexChart } from "./GrowthIndexChart";
import { InsightsPanel } from "./InsightsPanel";
import { KpiTiles } from "./KpiTiles";
import { MarginProfileChart } from "./MarginProfileChart";
import { RatioRadar } from "./RatioRadar";
import { RatioTable } from "./RatioTable";
import { RatioTrendChart } from "./RatioTrendChart";
import { StatementChart } from "./StatementChart";

type Period = "annual" | "quarterly";

const PRESETS = [
  ["MSFT", "AAPL"],
  ["GOOGL", "META"],
  ["KO", "PEP"],
  ["WMT", "COST"],
  ["JPM", "BAC"],
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Dashboard({
  plan,
  signedIn,
  initialTickers,
  initialPeriod,
}: {
  plan: Plan;
  signedIn: boolean;
  initialTickers: string[];
  initialPeriod: Period;
}) {
  const router = useRouter();
  const [tickers, setTickers] = useState(initialTickers);
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [data, setData] = useState<ComparePayload | null>(null);
  const [error, setError] = useState<{ message: string; upgrade: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hello, setHello] = useState("Welcome");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => setHello(greeting()), []);

  const load = useCallback(async (t: string[], p: Period) => {
    const qs = `tickers=${t.join(",")}&period=${p}`;
    // Update the shareable URL without a server round trip (router.replace would re-render the page on the server).
    window.history.replaceState(null, "", `/?${qs}`);
    if (t.length < 2) {
      setError({ message: "Add at least two companies to compare.", upgrade: false });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/compare?${qs}`);
      const json = await res.json();
      if (!res.ok) setError({ message: json.error, upgrade: Boolean(json.upgrade) });
      else setData(json);
    } catch {
      setError({ message: "Network error — try again.", upgrade: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tickers, period);
  }, [tickers, period, load]);

  const save = async () => {
    const name = prompt("Name this comparison", tickers.join(" vs "));
    if (!name) return;
    const res = await fetch("/api/saved", { method: "POST", body: JSON.stringify({ name, tickers: tickers.join(","), period }) });
    setSaved(res.ok ? "Saved ✓" : (await res.json()).error);
    setTimeout(() => setSaved(null), 2500);
  };

  const qs = `tickers=${tickers.join(",")}&period=${period}`;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-1">
        <div>
          <p className="text-sm text-muted">{hello} 👋</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Company Comparison</h1>
          <p className="mt-1 text-sm text-dim">Statements. Ratios. Meaning. Straight from SEC filings.</p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-edge bg-panel p-1">
            {(["annual", "quarterly"] as const).map((p) => {
              const locked = p === "quarterly" && !plan.quarterly;
              return (
                <button
                  key={p}
                  onClick={() => (locked ? router.push("/pricing") : setPeriod(p))}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs capitalize transition ${period === p ? "bg-blue/30 text-fg shadow-[0_0_14px_-4px_rgba(59,130,246,.8)]" : "text-muted hover:text-fg"}`}
                >
                  {locked ? <Lock className="size-3" /> : <CalendarRange className="size-3" />} {p}
                </button>
              );
            })}
          </div>
          {plan.csvExport ? (
            <a className="btn" href={`/api/export?${qs}`}>
              <Download className="size-4" /> CSV
            </a>
          ) : (
            <Link className="btn text-muted" href="/pricing" title="Standard plan">
              <Lock className="size-3.5" /> CSV
            </Link>
          )}
          {plan.savedComparisons ? (
            <button className="btn" onClick={save}>
              <Bookmark className="size-4" /> {saved ?? "Save"}
            </button>
          ) : (
            <Link className="btn text-muted" href={signedIn ? "/pricing" : "/login"} title="Pro plan">
              <Lock className="size-3.5" /> Save
            </Link>
          )}
          {plan.pdfReport ? (
            <Link className="btn btn-primary" href={`/report?${qs}`}>
              <FileText className="size-4" /> Report
            </Link>
          ) : (
            <Link className="btn text-muted" href="/pricing" title="Pro plan">
              <Lock className="size-3.5" /> Report
            </Link>
          )}
        </div>
      </header>

      <section className="glass no-print p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CompanyPicker tickers={tickers} max={plan.maxCompanies} onChange={setTickers} />
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-dim">Try:</span>
            {PRESETS.map((p) => (
              <button key={p.join()} className="chip hover:text-fg" onClick={() => setTickers(p)}>
                {p.join(" vs ")}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-dim">
          {plan.name} plan: up to {plan.maxCompanies} companies · {plan.quarterly ? `annual + quarterly, ${plan.years} years` : `annual, last ${plan.years} years`}
          {plan.id !== "pro" && (
            <>
              {" · "}
              <Link href="/pricing" className="text-cyan hover:underline">
                upgrade
              </Link>
            </>
          )}
        </p>
      </section>

      {error && (
        <div className={`glass flex items-center justify-between gap-3 p-4 text-sm ${error.upgrade ? "border-warn/40" : "border-down/40"}`}>
          <span className={error.upgrade ? "text-warn" : "text-down"}>{error.message}</span>
          {error.upgrade && (
            <Link href="/pricing" className="btn btn-primary">
              View plans
            </Link>
          )}
        </div>
      )}

      {loading && !data && (
        <div className="glass grid h-64 place-items-center text-muted">
          <span className="flex items-center gap-2">
            <Loader2 className="size-5 animate-spin" /> Pulling filings from SEC EDGAR…
          </span>
        </div>
      )}

      {data && (
        <div className={`space-y-5 transition-opacity ${loading ? "opacity-50" : ""}`}>
          <KpiTiles companies={data.companies} />
          <div className="grid gap-5 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <StatementChart companies={data.companies} />
            </div>
            <div className="xl:col-span-2">
              <RatioRadar companies={data.companies} />
            </div>
          </div>
          <div className="grid items-start gap-5 xl:grid-cols-5">
            <div className="space-y-5 xl:col-span-3">
              <RatioTrendChart companies={data.companies} allRatios={plan.allRatioTrends} />
              <GrowthIndexChart companies={data.companies} />
              <MarginProfileChart companies={data.companies} />
              <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <CapitalStructureChart companies={data.companies} />
                <CashVsProfitChart companies={data.companies} />
              </div>
            </div>
            <div className="xl:col-span-2">
              <InsightsPanel insights={data.insights} />
            </div>
          </div>
          <RatioTable companies={data.companies} />
          <DataNotes period={data.period} />
        </div>
      )}
    </div>
  );
}

function DataNotes({ period }: { period: Period }) {
  return (
    <section className="glass p-5 text-xs leading-relaxed text-muted">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
        <Info className="size-4 text-cyan" /> About the data
      </h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Financial statements come from the SEC EDGAR XBRL Company Facts API (10-K and 10-Q filings). Company profiles, logos and market caps come from Finnhub when configured.</li>
        <li>Companies have different fiscal year-ends (Apple: late September, Microsoft: June 30), so &quot;FY2025&quot; covers different calendar months for each.</li>
        {period === "quarterly" && <li>Q4 figures are derived as the full fiscal year minus Q1–Q3. Quarterly ROA/ROE are annualized (×4); growth compares to the same quarter a year earlier.</li>}
        <li>ROA and ROE use average assets/equity across the period. Total debt = long-term debt (incl. current portion) + commercial paper / short-term borrowings.</li>
        <li>&quot;n/a&quot; means the company doesn&apos;t report that line item (e.g. banks have no current assets) or the ratio isn&apos;t meaningful (negative equity).</li>
      </ul>
    </section>
  );
}
