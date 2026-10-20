/** Public base URL for redirects (Stripe success/cancel, portal return, auth emails). */
export function siteUrl(req?: Request): string {
  // On Vercel production, trust the platform's own domain over a hand-set value.
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  return req ? new URL(req.url).origin : "http://localhost:3000";
}
