import { NextResponse } from "next/server";
import { getTickers } from "@/lib/edgar";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toUpperCase().slice(0, 40);
  if (!q) return NextResponse.json([]);
  try {
    const all = await getTickers();
    const exact = all.filter((t) => t.ticker === q);
    const prefix = all.filter((t) => t.ticker !== q && t.ticker.startsWith(q));
    const byName = all.filter((t) => !t.ticker.startsWith(q) && t.name.toUpperCase().includes(q));
    return NextResponse.json([...exact, ...prefix, ...byName].slice(0, 8).map(({ ticker, name }) => ({ ticker, name })));
  } catch (err) {
    // SEC unavailable: return an empty list so the search box keeps working instead of erroring.
    console.error("[tickers]", err);
    return NextResponse.json([], { status: 502 });
  }
}
