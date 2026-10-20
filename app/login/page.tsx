import { BarChart3 } from "lucide-react";
import { supabaseConfigured } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { next } = await searchParams;
  return (
    <div className="grid min-h-[80vh] place-items-center">
      <div className="glass glass-glow w-full max-w-sm p-7">
        <span className="mb-5 grid size-11 place-items-center rounded-xl bg-blue/25 ring-1 ring-cyan/40">
          <BarChart3 className="size-5 text-cyan" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Welcome to FinCompare</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Sign in to subscribe and unlock deeper analysis.</p>
        {supabaseConfigured() ? (
          <LoginForm next={next ?? "/"} />
        ) : (
          <p className="text-sm text-warn">Supabase isn&apos;t configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.</p>
        )}
      </div>
    </div>
  );
}
