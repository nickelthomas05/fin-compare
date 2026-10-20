// One-time (idempotent) Stripe setup: products & prices, Customer Portal config, tax readiness report.
// Run with: npm run stripe:setup
import Stripe from "stripe";
import { PLANS } from "../lib/plans";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("Set STRIPE_SECRET_KEY in .env.local first");
if (key.startsWith("sk_live") || key.startsWith("rk_live")) throw new Error("Refusing to run setup against a live-mode key");
const stripe = new Stripe(key);
const taxCode = process.env.STRIPE_TAX_CODE || undefined;

async function ensurePrice(planId: "standard" | "pro") {
  const plan = PLANS[planId];
  const existing = await stripe.prices.list({ lookup_keys: [plan.lookupKey!], expand: ["data.product"], limit: 1 });
  if (existing.data[0]) {
    const price = existing.data[0];
    const product = price.product as Stripe.Product;
    if (taxCode && product.tax_code !== taxCode) await stripe.products.update(product.id, { tax_code: taxCode });
    console.log(`✓ ${plan.name}: ${price.id} (${product.id}) already exists`);
    return { price: price.id, product: product.id };
  }
  // One Product per plan so Checkout and invoices show distinct names.
  const product = await stripe.products.create({
    name: `FinCompare ${plan.name}`,
    description: plan.features.join(" · "),
    ...(taxCode && { tax_code: taxCode }),
    metadata: { app: "fincompare", plan: planId },
  });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: plan.price * 100,
    recurring: { interval: "month" },
    lookup_key: plan.lookupKey,
    tax_behavior: "exclusive",
    metadata: { app: "fincompare", plan: planId },
  });
  console.log(`+ ${plan.name}: created ${price.id} ($${plan.price}/mo) on ${product.id}`);
  return { price: price.id, product: product.id };
}

async function ensurePortal(items: { price: string; product: string }[]) {
  const features: Stripe.BillingPortal.ConfigurationCreateParams.Features = {
    customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end" },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ["price", "promotion_code"],
      proration_behavior: "create_prorations",
      products: items.map((i) => ({ product: i.product, prices: [i.price] })),
    },
  };
  const configs = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const ours = configs.data.find((c) => c.metadata?.app === "fincompare");
  if (ours) {
    await stripe.billingPortal.configurations.update(ours.id, { features });
    console.log(`✓ Customer Portal config ${ours.id} updated`);
    return ours.id;
  }
  const created = await stripe.billingPortal.configurations.create({
    business_profile: { headline: "Manage your FinCompare subscription" },
    features,
    metadata: { app: "fincompare" },
  });
  console.log(`+ Customer Portal config ${created.id} created`);
  return created.id;
}

async function taxReport() {
  const settings = await stripe.tax.settings.retrieve();
  const regs = await stripe.tax.registrations.list({ status: "active", limit: 100 });
  console.log(`\nStripe Tax settings status: ${settings.status}${settings.head_office ? "" : " (no head office address)"}`);
  console.log(`Active tax registrations: ${regs.data.length}${regs.data.length ? " — " + regs.data.map((r) => r.country).join(", ") : ""}`);
  if (settings.status !== "active" || regs.data.length === 0) {
    console.log("→ Leave STRIPE_AUTOMATIC_TAX=false until a head office address and a registration exist (Dashboard → Tax).");
    console.log("  With automatic tax on but no registration, Stripe silently collects $0 tax.");
  }
  if (!taxCode) {
    const codes = await stripe.taxCodes.list({ limit: 100 });
    const saas = codes.data.filter((c) => /software as a service|saas/i.test(c.name));
    console.log("\nNo STRIPE_TAX_CODE set. SaaS candidates from the Tax Codes API (confirm with your tax advisor):");
    for (const c of saas) console.log(`  ${c.id}  ${c.name}`);
  }
}

async function main() {
  const items = [await ensurePrice("standard"), await ensurePrice("pro")];
  const portalId = await ensurePortal(items);
  console.log(`\nAdd to .env.local: STRIPE_PORTAL_CONFIGURATION_ID=${portalId}`);
  await taxReport();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
