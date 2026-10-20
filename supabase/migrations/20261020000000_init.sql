-- FinCompare schema: profiles, Stripe subscriptions, saved comparisons, webhook log, financials cache.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id text primary key,                         -- Stripe subscription id (sub_...)
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_customer_id text not null,
  status text not null,                        -- active | trialing | past_due | canceled | ...
  plan text not null check (plan in ('standard', 'pro')),
  price_id text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
create index subscriptions_user_id_idx on public.subscriptions (user_id);

create table public.saved_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  tickers text[] not null check (cardinality(tickers) between 2 and 6),
  period text not null default 'annual' check (period in ('annual', 'quarterly')),
  created_at timestamptz not null default now()
);
create index saved_comparisons_user_id_idx on public.saved_comparisons (user_id);

-- Stripe webhook events already processed (idempotency + audit of disputes/refunds/fraud warnings).
create table public.billing_events (
  id text primary key,                         -- Stripe event id (evt_...)
  type text not null,
  subscription_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Normalized SEC financials, cached server-side to avoid re-downloading multi-MB companyfacts files.
create table public.company_financials (
  ticker text primary key,
  cik bigint not null,
  name text not null,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.saved_comparisons enable row level security;
alter table public.billing_events enable row level security;
alter table public.company_financials enable row level security;

create policy "Users read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "Users read own subscriptions" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Users read own comparisons" on public.saved_comparisons
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create own comparisons" on public.saved_comparisons
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users delete own comparisons" on public.saved_comparisons
  for delete to authenticated using ((select auth.uid()) = user_id);

-- billing_events and company_financials have no policies: only the service role (server) touches them.

-- Create a profile row for every new auth user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
