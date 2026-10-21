import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe, subscriptionForPaymentIntent, syncSubscription } from "@/lib/stripe";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const idOf = (ref: string | { id: string } | null | undefined) => (typeof ref === "string" ? ref : (ref?.id ?? null));

export async function POST(req: Request) {
  const secret = env.stripeWebhookSecret;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Supabase service role not configured" }, { status: 500 });

  // Idempotency: Stripe retries deliveries, so skip events we've already processed.
  const { data: seen } = await admin.from("billing_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  let subscriptionId: string | null = null;
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        subscriptionId = idOf(session.subscription);
        if (session.mode === "subscription" && subscriptionId && session.payment_status !== "unpaid") {
          await syncSubscription(await stripe.subscriptions.retrieve(subscriptionId));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        subscriptionId = sub.id;
        // Re-fetch so out-of-order deliveries always store the latest state.
        await syncSubscription(await stripe.subscriptions.retrieve(sub.id));
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        // Renewals and failed charges move the subscription between active / past_due / unpaid.
        subscriptionId = idOf(event.data.object.parent?.subscription_details?.subscription);
        if (subscriptionId) await syncSubscription(await stripe.subscriptions.retrieve(subscriptionId));
        break;
      }
      case "charge.refunded":
      case "charge.dispute.created": {
        const obj = event.data.object;
        const paymentIntent = "payment_intent" in obj ? idOf(obj.payment_intent) : null;
        subscriptionId = await subscriptionForPaymentIntent(paymentIntent);
        console.warn(`[stripe] ${event.type} for subscription ${subscriptionId ?? "unknown"} — review in the Dashboard`);
        break;
      }
      case "radar.early_fraud_warning.created": {
        const warning = event.data.object;
        subscriptionId = await subscriptionForPaymentIntent(idOf(warning.payment_intent));
        console.warn(`[stripe] Early fraud warning for subscription ${subscriptionId ?? "unknown"} — consider refunding and canceling`);
        break;
      }
      default:
        return NextResponse.json({ received: true, ignored: event.type });
    }
  } catch (err) {
    console.error(`[stripe] Failed to handle ${event.type} ${event.id}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 }); // Stripe will retry
  }

  await admin.from("billing_events").insert({
    id: event.id,
    type: event.type,
    subscription_id: subscriptionId,
    payload: event.data.object as unknown as Record<string, unknown>,
  });
  return NextResponse.json({ received: true });
}
