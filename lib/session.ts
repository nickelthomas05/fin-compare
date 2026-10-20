import "server-only";
import { ACTIVE_STATUSES, PLAN_ORDER, PLANS, type Plan, type PlanId } from "./plans";
import { createClient, supabaseConfigured } from "./supabase/server";

export type Viewer = {
  user: { id: string; email: string | null } | null;
  plan: Plan;
  subscription: { status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null;
  authEnabled: boolean;
};

/** The signed-in user (if any) and their effective plan. Anonymous visitors get the Free plan. */
export async function getViewer(): Promise<Viewer> {
  const free: Viewer = { user: null, plan: PLANS.free, subscription: null, authEnabled: supabaseConfigured() };
  if (!free.authEnabled) return free;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return free;

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end, cancel_at_period_end")
    .in("status", ACTIVE_STATUSES);

  const best = (subs ?? []).sort(
    (a, b) => PLAN_ORDER.indexOf(b.plan as PlanId) - PLAN_ORDER.indexOf(a.plan as PlanId),
  )[0];

  return {
    user: { id: user.id, email: user.email ?? null },
    plan: best ? PLANS[best.plan as PlanId] : PLANS.free,
    subscription: best
      ? { status: best.status, currentPeriodEnd: best.current_period_end, cancelAtPeriodEnd: best.cancel_at_period_end }
      : null,
    authEnabled: true,
  };
}
