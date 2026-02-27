import { NextRequest, NextResponse } from "next/server";
import { getTrialState } from "./lib/trial-gate";

// ─── middleware.ts (REPO ROOT) ────────────────────────────────────
// Enforces trial gate on every protected request.
// No grace periods. No exceptions. No bending.

export const config = {
  matcher: [
    "/home",
    "/snapshot",
    "/email-preview",
    "/burn-input",
  ],
};

export async function middleware(req: NextRequest) {
  const companyId = req.cookies.get("candor_company_id")?.value;
  const path      = req.nextUrl.pathname;

  // No session → connect Stripe
  if (!companyId) {
    return NextResponse.redirect(new URL("/connect-stripe", req.url));
  }

  const state = await getTrialState(companyId);

  switch (state.status) {

    // Demo: full access always
    case "demo":
      return NextResponse.next();

    // Paid: full access
    case "paid":
      return NextResponse.next();

    // Active trial: full access
    case "active":
      return NextResponse.next();

    // Pre-trial: free flow (setup, snapshot, burn, email-preview allowed)
    // They haven't received an email yet — don't gate them out
    case "pre_trial":
      return NextResponse.next();

    // Expired: read-only, redirect to expiry page
    case "expired": {
      // Allow /home in read-only mode (they can see last email)
      if (path === "/home") {
        // Attach expired flag so page can show banner
        const res = NextResponse.next();
        res.headers.set("x-trial-expired", "true");
        return res;
      }
      // Everything else → expiry wall
      return NextResponse.redirect(new URL("/expired", req.url));
    }

    // Unknown state → boot back to start
    default:
      return NextResponse.redirect(new URL("/connect-stripe", req.url));
  }
}
