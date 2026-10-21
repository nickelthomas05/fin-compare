import { siteUrl } from "@/lib/site";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { getViewer } from "@/lib/session";
import { CHECKOUT_INTEGRATION_ID, ensureCustomer, getStripe, priceIdFor } from "@/lib/stripe";

const Body = z.object({ plan: z.enum(["standard", "pro"]) });

export async function POST(req: Request) {
  const form = await req.formData();
  const parsed = Body.safeParse({ plan: form.get("plan") });
  const site = siteUrl(req);
  if (!parsed.success) return NextResponse.redirect(`${site}/pricing?error=plan`, 303);

  const viewer = await getViewer();
  if (!viewer.user) return NextResponse.redirect(`${site}/login?next=/pricing`, 303);

  // Existing subscribers change plans in the Customer Portal (prorated) instead of opening a second subscription.
  if (viewer.subscription) return NextResponse.redirect(`${site}/api/stripe/portal`, 303);

  // Which step failed is surfaced on the pricing page (no secrets), so misconfiguration is diagnosable without logs.
  let step = "customer";
  try {
    const customer = await ensureCustomer(viewer.user.id, viewer.user.email);
    step = "price";
    const price = await priceIdFor(parsed.data.plan);
    step = "session";
    const automaticTax = process.env.STRIPE_AUTOMATIC_TAX === "true";
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      customer,
      client_reference_id: viewer.user.id,
      line_items: [{ price, quantity: 1 }],
      success_url: `${site}/account?checkout=success`,
      cancel_url: `${site}/pricing?checkout=canceled`,
      allow_promotion_codes: true,
      integration_identifier: CHECKOUT_INTEGRATION_ID,
      ...(automaticTax && {
        automatic_tax: { enabled: true },
        customer_update: { address: "auto", name: "auto" },
        tax_id_collection: { enabled: true },
      }),
    };
    const session = await getStripe().checkout.sessions.create(params);
    return NextResponse.redirect(session.url!, 303);
  } catch (err) {
    console.error(`[stripe] checkout failed at ${step}`, err);
    const reason = err instanceof Error ? err.message.split(":")[0].slice(0, 60) : "unknown";
    return NextResponse.redirect(`${site}/pricing?error=checkout&step=${step}&reason=${encodeURIComponent(reason)}`, 303);
  }
}
