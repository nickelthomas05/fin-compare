import { NextResponse } from "next/server";
import { compare, parseTickers, UserError } from "@/lib/company";
import { getViewer } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tickers = parseTickers(url.searchParams.get("tickers"));
  const period = url.searchParams.get("period") === "quarterly" ? "quarterly" : "annual";
  const { plan } = await getViewer();
  try {
    return NextResponse.json(await compare(tickers, period, plan));
  } catch (err) {
    if (err instanceof UserError)
      return NextResponse.json({ error: err.message, upgrade: err.cause === "upgrade" }, { status: err.cause === "upgrade" ? 402 : 400 });
    console.error("[compare]", err);
    return NextResponse.json({ error: "Could not load financial data from SEC EDGAR. Try again shortly." }, { status: 502 });
  }
}
