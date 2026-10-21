# FinCompare — Financial Statement Analysis & Company Comparison Tool

**Financial problem:** analyzing financial statements by hand is slow, and comparing companies is hard because every firm uses different fiscal years, line-item names and scales. FinCompare pulls statements straight from SEC filings, normalizes them, computes the standard ratios and explains in plain English what the differences mean.

Applied Finance & FinTech prototype · Built with Claude Code · Next.js 15, TypeScript, Supabase, Stripe, Recharts

**Live demo:** https://fin-compare-plum.vercel.app

## Requirements → features

| Requirement | Where it lives |
| --- | --- |
| Select at least two public companies | Searchable picker over every SEC registrant (`/api/tickers`), presets such as MSFT vs AAPL |
| Retrieve financial statement data | SEC EDGAR XBRL **Company Facts API** (`lib/edgar.ts`) normalized in `lib/normalize.ts`; Finnhub **Company Profile** + quote for logo, industry and market cap (`lib/finnhub.ts`) |
| Profitability, liquidity, leverage ratios | `lib/ratios.ts` — 14 ratios with formulas (see below) |
| Compare revenue & net income across periods | Annual (10-K) and quarterly (10-Q, Q4 derived) series; "Revenue vs Net Income" chart + growth/CAGR |
| Interactive charts | Grouped bar chart, ratio trend area chart, radar profile, sparkline KPI tiles (hover tooltips, metric/ratio switchers) |
| Explain the financial meaning of differences | Rule-based analyst narrative in `lib/explain.ts` (margins, DuPont ROE, liquidity, leverage, growth, bottom line) |

## Ratios

| Category | Ratio | Formula |
| --- | --- | --- |
| Growth | Revenue growth, Net income growth | (Current − prior) ÷ prior (quarterly: vs same quarter last year) |
| Profitability | Gross / Operating / Net margin | Gross profit, Operating income, Net income ÷ Revenue |
| | Return on assets | Net income ÷ average total assets |
| | Return on equity | Net income ÷ average shareholders' equity |
| Liquidity | Current ratio | Current assets ÷ Current liabilities |
| | Quick ratio | (Current assets − Inventory) ÷ Current liabilities |
| | Cash ratio | Cash & equivalents ÷ Current liabilities |
| Leverage | Debt-to-equity, Debt-to-assets | Total debt ÷ Equity, ÷ Assets |
| | Liabilities-to-equity | Total liabilities ÷ Equity |
| | Equity multiplier | Average assets ÷ average equity (ROE = ROA × EM) |

Total debt = long-term debt (incl. current portion) + commercial paper / short-term borrowings. Ratios are `n/a` when a company doesn't report the inputs (e.g. banks have no current assets) or when equity is negative.

## Plans (Stripe subscriptions)

| | Free $0 | Standard $20/mo | Pro $30/mo |
| --- | --- | --- | --- |
| Companies per comparison | 2 | 4 | 6 |
| History | Annual, 3 years | Annual + quarterly, 10 years | Annual + quarterly, 10 years |
| Ratio trend charts | 5 core | 5 core | All 14 |
| CSV export | — | ✓ | ✓ |
| Saved comparisons | — | — | ✓ |
| Printable PDF report | — | — | ✓ |

Limits are enforced server-side (`lib/company.ts`, API routes), not just in the UI.

## Architecture

```
Browser ──► Next.js App Router
             ├─ /api/compare   → EDGAR companyfacts → normalize → ratios → explain   (cached in Supabase)
             ├─ /api/tickers   → EDGAR company_tickers.json
             ├─ /api/export    → CSV (Standard+)
             ├─ /api/saved     → Supabase saved_comparisons (Pro, RLS)
             ├─ /api/stripe/checkout → Stripe Checkout (mode=subscription)
             ├─ /api/stripe/portal   → Stripe Customer Portal (upgrade/downgrade/cancel, invoices)
             └─ /api/stripe/webhook  → verifies signature → syncs subscriptions table
Supabase: Auth (email + password), profiles, subscriptions, saved_comparisons, billing_events, company_financials
```

Webhook events handled: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created|updated|deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `charge.dispute.created`, `radar.early_fraud_warning.created`. Events are recorded in `billing_events` for idempotency.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values below
```

1. **SEC EDGAR** — no key. Set `SEC_USER_AGENT` to a name + email (SEC requirement).
2. **Finnhub** (optional) — free key at finnhub.io → `FINNHUB_API_KEY`.
3. **Supabase** — create a project, then run `supabase/migrations/20261020000000_init.sql` in the SQL editor (or `supabase db push`). Copy the URL, anon key and service-role key into `.env.local`. For quick demos, disable "Confirm email" under Auth → Providers → Email.
4. **Stripe** (use a sandbox; a restricted key is preferred):
   ```bash
   npm run stripe:setup
   ```
   Creates the Standard and Pro products/prices (lookup keys `fincompare_standard_monthly`, `fincompare_pro_monthly`), a Customer Portal configuration, and prints a Stripe Tax readiness report. Put the printed `STRIPE_PORTAL_CONFIGURATION_ID` in `.env.local`.
5. **Webhooks (local)** — with the [Stripe CLI](https://docs.stripe.com/stripe-cli):
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the `whsec_...` secret into `STRIPE_WEBHOOK_SECRET`. In production, add an endpoint in the Dashboard for the events listed above.
6. Run it:
   ```bash
   npm run dev
   ```

Test card: `4242 4242 4242 4242`, any future date, any CVC.

### Deploying to Vercel

Import the repo at vercel.com/new and paste the variables from `.env.local`. **If Vercel's Stripe or Supabase marketplace integration is attached to the project, it replaces `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_SUPABASE_*` with keys for accounts it created.** Set `FINCOMPARE_STRIPE_SECRET_KEY`, `FINCOMPARE_SUPABASE_URL`, `FINCOMPARE_SUPABASE_ANON_KEY` and `FINCOMPARE_SUPABASE_SERVICE_ROLE_KEY`, which take priority (`lib/env.ts`). `GET /api/health` reports which Stripe account and Supabase project the deployment is using (IDs only). Create a Stripe webhook endpoint for `https://<your-domain>/api/stripe/webhook` and set `STRIPE_WEBHOOK_SECRET`.

### Stripe Tax

Checkout enables `automatic_tax` only when `STRIPE_AUTOMATIC_TAX=true`. Turn it on **after** adding a head office address and at least one tax registration (Dashboard → Tax); with no registration Stripe silently collects $0. Set `STRIPE_TAX_CODE` to the product tax code that fits (the setup script lists the SaaS codes from the [Tax Codes API](https://docs.stripe.com/tax/tax-codes)) and rerun `npm run stripe:setup`. Invoices are generated automatically for every subscription renewal and are listed on the Account page.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm test` | Vitest unit tests (normalization, ratios, explanations) |
| `npm run lint` / `npm run build` | Lint / production build |
| `npm run stripe:setup` | Idempotent Stripe catalog + portal setup |

## Data caveats

- Fiscal years differ (Apple ends late September, Microsoft June 30), so "FY2025" spans different months per company.
- Q4 is derived as the full year minus Q1–Q3 because 10-Ks don't report it separately; quarterly ROA/ROE are annualized ×4.
- XBRL tags change over time; `lib/normalize.ts` tries several candidate tags per line item and keeps the most recently filed value for each period.

## AI tools used

Built with **Claude Code** (Anthropic) for planning, implementation, tests and verification against live SEC data.
