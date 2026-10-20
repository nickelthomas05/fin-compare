import { compare, parseTickers, UserError } from "@/lib/company";
import { RATIOS } from "@/lib/ratios";
import { getViewer } from "@/lib/session";

const VALUE_COLS = ["revenue", "grossProfit", "operatingIncome", "netIncome", "operatingCashFlow", "assets", "currentAssets", "currentLiabilities", "liabilities", "equity", "debt", "inventory", "cash"] as const;

const cell = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const { plan } = await getViewer();
  if (!plan.csvExport) return new Response("CSV export is available on the Standard and Pro plans.", { status: 402 });
  const url = new URL(req.url);
  const period = url.searchParams.get("period") === "quarterly" ? "quarterly" : "annual";
  try {
    const data = await compare(parseTickers(url.searchParams.get("tickers")), period, plan);
    const header = ["ticker", "period", "end", ...VALUE_COLS, ...RATIOS.map((r) => r.key)];
    const lines = [header.join(",")];
    for (const c of data.companies)
      for (const r of c.rows)
        lines.push([c.ticker, r.label, r.end, ...VALUE_COLS.map((k) => r.values[k]), ...RATIOS.map((d) => r.ratios[d.key])].map(cell).join(","));
    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fincompare-${data.companies.map((c) => c.ticker).join("-")}-${period}.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof UserError) return new Response(err.message, { status: 400 });
    throw err;
  }
}
