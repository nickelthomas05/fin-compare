// FINCOMPARE_* names win over the standard ones, because hosting integrations
// (e.g. Vercel's Stripe/Supabase marketplace apps) can silently replace
// STRIPE_SECRET_KEY / NEXT_PUBLIC_SUPABASE_* with keys for a different account.
export const env = {
  stripeSecretKey: process.env.FINCOMPARE_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.FINCOMPARE_STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET,
  supabaseUrl: process.env.FINCOMPARE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.FINCOMPARE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.FINCOMPARE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
};
