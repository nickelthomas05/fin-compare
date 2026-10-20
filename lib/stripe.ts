import "server-only";
import Stripe from "stripe";
import { planForLookupKey, PLANS, type PlanId } from "./plans";
import { createAdminClient } from "./supabase/server";

let client: Stripe | null = null;

/** Shared Stripe client instance (pinned to the SDK's API version). */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key, { appInfo: { name: "FinCompare" } });
  return client;
}

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/** Tags Checkout Sessions from the pricing page so the flow can be tracked in the Dashboard. */
export const CHECKOUT_INTEGRATION_ID = "fincompare_pricing_qhtwzmke";

export async function priceIdFor(plan: PlanId): Promise<string> {
  const lookupKey = PLANS[plan].lookupKey;
  if (!lookupKey) throw new Error(`Plan ${plan} has no Stripe price`);
  const prices = await getStripe().prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) throw new Error(`No active Stripe price with lookup_key ${lookupKey}. Run \`npm run stripe:setup\`.`);
  return price.id;
}

/** Returns the Stripe Customer for a Supabase user, creating and linking one if needed. */
export async function ensureCustomer(userId: string, email: string | null): Promise<string> {
  const admin = createAdminClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for billing");
  const { data: profile } = await admin.from("profiles").select("stripe_customer_id").eq("id", userId).single();
  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await getStripe().customers.create(
    { email: email ?? undefined, metadata: { supabase_user_id: userId } },
    { idempotencyKey: `customer-${userId}` },
  );
  await admin.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId);
  return customer.id;
}

/** Mirrors a Stripe Subscription into the `subscriptions` table. */
export async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for billing");
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Map Stripe Customer → app user through our own profiles table; customer metadata is only a fallback.
  const { data: profile } = await admin.from("profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle();
  let userId = profile?.id as string | undefined;
  if (!userId) {
    const customer = await getStripe().customers.retrieve(customerId);
    userId = customer.deleted ? undefined : customer.metadata?.supabase_user_id;
    if (userId) await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  }
  if (!userId) throw new Error(`No app user for Stripe customer ${customerId}`);

  const item = sub.items.data[0];
  const plan = planForLookupKey(item?.price.lookup_key);
  if (!plan || plan === "free") throw new Error(`Unknown price ${item?.price.id} on ${sub.id}`);

  const { error } = await admin.from("subscriptions").upsert({
    id: sub.id,
    user_id: userId,
    stripe_customer_id: customerId,
    status: sub.status,
    plan,
    price_id: item.price.id,
    current_period_end: item.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Failed to save subscription ${sub.id}: ${error.message}`);
}

/** Resolves the Subscription behind a PaymentIntent via its InvoicePayment → Invoice. */
export async function subscriptionForPaymentIntent(paymentIntentId: string | null): Promise<string | null> {
  if (!paymentIntentId) return null;
  const stripe = getStripe();
  const payments = await stripe.invoicePayments.list({
    payment: { type: "payment_intent", payment_intent: paymentIntentId },
    limit: 1,
  });
  const invoiceRef = payments.data[0]?.invoice;
  if (!invoiceRef) return null;
  const invoice = typeof invoiceRef === "string" ? await stripe.invoices.retrieve(invoiceRef) : invoiceRef;
  if ("deleted" in invoice && invoice.deleted) return null;
  const sub = (invoice as Stripe.Invoice).parent?.subscription_details?.subscription;
  return typeof sub === "string" ? sub : (sub?.id ?? null);
}
