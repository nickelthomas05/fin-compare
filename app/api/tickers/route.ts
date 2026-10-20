import { NextResponse } from "next/server";
import { getTickers } from "@/lib/edgar";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toUpperCase();
  if (!q) return NextResponse.json([]);
  const all = await getTickers();
  const exact = all.filter((t) => t.ticker === q);
  const prefix = all.filter((t) => t.ticker !== q && t.ticker.startsWith(q));
  const byName = all.filter((t) => !t.ticker.startsWith(q) && t.name.toUpperCase().includes(q));
  return NextResponse.json([...exact, ...prefix, ...byName].slice(0, 8).map(({ ticker, name }) => ({ ticker, name })));
}
