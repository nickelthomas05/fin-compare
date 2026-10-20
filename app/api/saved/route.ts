import { NextResponse } from "next/server";
import { z } from "zod";
import { parseTickers } from "@/lib/company";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({ name: z.string().trim().min(1).max(80), tickers: z.string(), period: z.enum(["annual", "quarterly"]) });

async function guard() {
  const viewer = await getViewer();
  if (!viewer.user) return { error: NextResponse.json({ error: "Sign in to save comparisons." }, { status: 401 }) };
  if (!viewer.plan.savedComparisons)
    return { error: NextResponse.json({ error: "Saved comparisons are a Pro feature.", upgrade: true }, { status: 402 }) };
  return { supabase: await createClient() };
}

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;
  const { data, error } = await g.supabase.from("saved_comparisons").select("id, name, tickers, period, created_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const g = await guard();
  if (g.error) return g.error;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid comparison" }, { status: 400 });
  const tickers = parseTickers(parsed.data.tickers);
  const { data, error } = await g.supabase
    .from("saved_comparisons")
    .insert({ name: parsed.data.name, tickers, period: parsed.data.period })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: Request) {
  const g = await guard();
  if (g.error) return g.error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await g.supabase.from("saved_comparisons").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return new NextResponse(null, { status: 204 });
}
