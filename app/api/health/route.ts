import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getStripe, stripeConfigured } from "@/lib/stripe";

// Reports which accounts the deployment is wired to — identifiers only, never keys.
export async function GET() {
  let stripeAccount: string | null = null;
  let pricesFound = 0;
  if (stripeConfigured()) {
    try {
      const stripe = getStripe();
      stripeAccount = (await stripe.accounts.retrieveCurrent()).id;
      pricesFound = (await stripe.prices.list({ lookup_keys: ["fincompare_standard_monthly", "fincompare_pro_monthly"], active: true })).data.length;
    } catch (err) {
      stripeAccount = `error: ${(err as Error).message.split(":")[0]}`;
    }
  }
  return NextResponse.json({
    stripeAccount,
    pricesFound,
    stripeKeySource: process.env.FINCOMPARE_STRIPE_SECRET_KEY ? "FINCOMPARE_STRIPE_SECRET_KEY" : "STRIPE_SECRET_KEY",
    supabaseProject: env.supabaseUrl ? new URL(env.supabaseUrl).hostname.split(".")[0] : null,
    supabaseServiceKey: Boolean(env.supabaseServiceKey),
    webhookSecret: Boolean(env.stripeWebhookSecret),
  });
}
