import { Dashboard } from "@/components/Dashboard";
import { parseTickers } from "@/lib/company";
import { getViewer } from "@/lib/session";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { plan, user } = await getViewer();
  const tickers = parseTickers(sp.tickers ?? null).slice(0, plan.maxCompanies);
  const period = sp.period === "quarterly" && plan.quarterly ? "quarterly" : "annual";
  return (
    <Dashboard
      plan={plan}
      signedIn={Boolean(user)}
      initialTickers={tickers.length >= 2 ? tickers : ["MSFT", "AAPL"]}
      initialPeriod={period}
    />
  );
}
