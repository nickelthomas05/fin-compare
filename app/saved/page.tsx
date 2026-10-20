import Link from "next/link";
import { Bookmark, Lock } from "lucide-react";
import { getViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { DeleteSaved } from "./DeleteSaved";

export default async function Saved() {
  const viewer = await getViewer();
  const locked = !viewer.plan.savedComparisons;
  const rows =
    viewer.user && !locked
      ? ((await (await createClient()).from("saved_comparisons").select("id, name, tickers, period, created_at").order("created_at", { ascending: false })).data ?? [])
      : [];

  return (
    <div className="space-y-5 pt-1">
      <header>
        <p className="text-sm text-muted">Library</p>
        <h1 className="text-3xl font-bold tracking-tight">Saved comparisons</h1>
      </header>
      {locked ? (
        <div className="glass glass-glow flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Lock className="size-4 text-cyan" /> Saving comparisons is part of the Pro plan.
          </p>
          <Link href={viewer.user ? "/pricing" : "/login?next=/pricing"} className="btn btn-primary">
            {viewer.user ? "Upgrade to Pro" : "Sign in"}
          </Link>
        </div>
      ) : rows.length === 0 ? (
        <p className="glass p-5 text-sm text-muted">Nothing saved yet. Use the Save button on the dashboard.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="glass flex items-start justify-between gap-3 p-4">
              <Link href={`/?tickers=${r.tickers.join(",")}&period=${r.period}`} className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold">
                  <Bookmark className="size-4 text-cyan" /> {r.name}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {r.tickers.join(" · ")} · {r.period} · {new Date(r.created_at).toLocaleDateString()}
                </p>
              </Link>
              <DeleteSaved id={r.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
