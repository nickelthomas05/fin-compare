import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, ExternalLink, LogOut, Receipt } from "lucide-react";
import { getViewer } from "@/lib/session";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

async function invoicesFor(userId: string) {
  if (!stripeConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("stripe_customer_id").eq("id", userId).single();
  if (!data?.stripe_customer_id) return [];
  const list = await getStripe().invoices.list({ customer: data.stripe_customer_id, limit: 12 });
  return list.data;
}

export default async function Account({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  if (!viewer.authEnabled) return <p className="glass p-5 text-sm text-warn">Configure Supabase in .env.local to enable accounts.</p>;
  if (!viewer.user) redirect("/login?next=/account");
  const invoices = await invoicesFor(viewer.user.id);
  const sub = viewer.subscription;

  return (
    <div className="space-y-5 pt-1">
      <header>
        <p className="text-sm text-muted">Account</p>
        <h1 className="text-3xl font-bold tracking-tight">{viewer.user.email}</h1>
      </header>

      {sp.checkout === "success" && (
        <p className="glass border-teal/40 p-3 text-sm text-teal">
          Payment received — your plan updates as soon as Stripe confirms the subscription (usually a few seconds). Refresh if it still shows Free.
        </p>
      )}
      {sp.error && <p className="glass border-down/40 p-3 text-sm text-down">Couldn&apos;t open the billing portal. Try again.</p>}

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="glass glass-glow p-5">
          <h2 className="card-title flex items-center gap-2">
            <CreditCard className="size-4 text-cyan" /> Plan
          </h2>
          <p className="mt-3 text-3xl font-bold">{viewer.plan.name}</p>
          <p className="text-sm text-muted">${viewer.plan.price}/month</p>
          {sub && (
            <p className="mt-2 text-xs text-muted">
              Status: <span className="text-fg">{sub.status}</span>
              {sub.currentPeriodEnd &&
                ` · ${sub.cancelAtPeriodEnd ? "ends" : "renews"} ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {sub ? (
              <a href="/api/stripe/portal" className="btn btn-primary">
                Manage billing
              </a>
            ) : (
              <Link href="/pricing" className="btn btn-primary">
                Upgrade
              </Link>
            )}
            <form action={signOut}>
              <button className="btn">
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
          </div>
        </section>

        <section className="glass p-5 lg:col-span-2">
          <h2 className="card-title flex items-center gap-2">
            <Receipt className="size-4 text-cyan" /> Invoices
          </h2>
          {invoices.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No invoices yet.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-2 font-medium">Invoice</th>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                  <th className="py-2 text-right font-medium">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-edge/60">
                    <td className="py-2.5">{inv.number ?? inv.id}</td>
                    <td className="py-2.5 text-muted">{new Date(inv.created * 1000).toLocaleDateString()}</td>
                    <td className="py-2.5 text-right tabular-nums">${(inv.total / 100).toFixed(2)}</td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs ring-1 ${
                          inv.status === "paid" ? "bg-up/10 text-up ring-up/30" : inv.status === "open" ? "bg-warn/10 text-warn ring-warn/30" : "text-muted ring-edge"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {inv.hosted_invoice_url && (
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan hover:underline">
                          View <ExternalLink className="size-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
