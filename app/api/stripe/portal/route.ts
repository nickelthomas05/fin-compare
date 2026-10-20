import { NextResponse } from "next/server";
import { getViewer } from "@/lib/session";
import { ensureCustomer, getStripe } from "@/lib/stripe";

async function portal(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const viewer = await getViewer();
  if (!viewer.user) return NextResponse.redirect(`${site}/login?next=/account`, 303);
  try {
    const customer = await ensureCustomer(viewer.user.id, viewer.user.email);
    const session = await getStripe().billingPortal.sessions.create({
      customer,
      return_url: `${site}/account`,
      ...(process.env.STRIPE_PORTAL_CONFIGURATION_ID && { configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID }),
    });
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error("[stripe] portal failed", err);
    return NextResponse.redirect(`${site}/account?error=portal`, 303);
  }
}

export { portal as GET, portal as POST };
