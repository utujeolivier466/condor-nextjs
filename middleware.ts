import { NextRequest, NextResponse } from "next/server";
import { getTrialState } from "@/lib/trial-gate";

// ─── middleware.ts (REPO ROOT) ────────────────────────────────────
// One rule: stripe_account_id = identity.
// No Stripe = no product. No exceptions. No demos.
//
// Silent failure: if they dropped off onboarding, nothing chases them.
// They either finish or they don't. Silence is the filter.

export const config = {
  matcher: [
    "/snapshot",
    "/burn-input",
    "/email-preview",
    "/home",
    "/reality-lock",
  ],
};

export async function middleware(req: NextRequest) {
  const companyId = req.cookies.get("candor_company_id")?.value;
  const path      = req.nextUrl.pathname;

  // No stripe_account_id = no access. Full stop.
  // We do not redirect to onboarding. We do not explain.
  // If they want in, they know where to go.
  if (!companyId) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Demo accounts: kill access. Real Stripe only.
  // Any demo_ prefix = leftover from old system = boot to onboarding.
  if (companyId.startsWith("demo_")) {
    const res = NextResponse.redirect(new URL("/onboarding", req.url));
    res.cookies.delete("candor_company_id");
    res.cookies.delete("candor_demo_data");
    return res;
  }

  // Check trial state
  const state = await getTrialState(companyId);

  switch (state.status) {
    case "paid":
      return NextResponse.next();

    case "active":
      return NextResponse.next();

    case "pre_trial":
      // They're in the funnel — allow through
      return NextResponse.next();

    case "expired": {
      if (path === "/home") {
        // Read-only access: pass through, page shows banner
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/expired", req.url));
    }

    case "demo":
      // Demo state = boot to onboarding silently
      const res = NextResponse.redirect(new URL("/onboarding", req.url));
      res.cookies.delete("candor_company_id");
      return res;
  }
}
