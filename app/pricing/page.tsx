import Link from "next/link";
import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { getViewer } from "@/lib/session";

const ICON = { free: Sparkles, standard: Zap, pro: Crown };

export default async function Pricing({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const viewer = await getViewer();

  return (
    <div className="space-y-6 pt-1">
      <header>
        <p className="text-sm text-muted">Plans</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pick the depth of analysis you need</h1>
        <p className="mt-1 text-sm text-dim">Billed monthly through Stripe. Change or cancel anytime from your account.</p>
      </header>

      {sp.checkout === "canceled" && <p className="glass p-3 text-sm text-muted">Checkout canceled — you haven&apos;t been charged.</p>}
      {sp.error && (
        <p className="glass border-down/40 p-3 text-sm text-down">
          Something went wrong starting checkout. Please try again.
          {sp.step && (
            <span className="mt-1 block text-xs text-muted">
              Failed step: {sp.step}
              {sp.reason && ` — ${sp.reason}`}
            </span>
          )}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const Icon = ICON[id];
          const current = viewer.plan.id === id;
          const featured = id === "pro";
          return (
            <div key={id} className={`glass flex flex-col p-6 ${featured ? "glass-glow" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-blue/20 ring-1 ring-blue/40">
                  <Icon className="size-5 text-cyan" />
                </span>
                {featured && <span className="chip border-cyan/40 text-cyan">Most complete</span>}
                {current && <span className="chip border-teal/40 text-teal">Current plan</span>}
              </div>
              <h2 className="mt-4 text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1">
                <span className="text-4xl font-bold tracking-tight">${plan.price}</span>
                <span className="text-sm text-muted"> / month</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-muted">
                    <Check className="mt-0.5 size-4 shrink-0 text-teal" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {id === "free" ? (
                  <Link href="/" className="btn w-full">
                    {current ? "Open dashboard" : "Included"}
                  </Link>
                ) : current ? (
                  <a href="/api/stripe/portal" className="btn w-full">
                    Manage subscription
                  </a>
                ) : !viewer.authEnabled ? (
                  <button className="btn w-full" disabled>
                    Configure Supabase to subscribe
                  </button>
                ) : !viewer.user ? (
                  <Link href="/login?next=/pricing" className={`btn w-full ${featured ? "btn-primary" : ""}`}>
                    Sign in to subscribe
                  </Link>
                ) : (
                  <form action="/api/stripe/checkout" method="post">
                    <input type="hidden" name="plan" value={id} />
                    <button className={`btn w-full ${featured ? "btn-primary" : ""}`}>
                      {viewer.subscription ? `Switch to ${plan.name}` : `Get ${plan.name}`}
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-dim">
        Test mode: use card 4242 4242 4242 4242, any future date and any CVC. Applicable sales tax is calculated at checkout where enabled.
      </p>
    </div>
  );
}
