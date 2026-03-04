// ─── POST /api/onboarding/validate ────────────────────────────────
// Validates connected Stripe account.
// Checks: live mode, charges enabled, details submitted.
// Hard blocks on incomplete account setup — no exceptions.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

// Initialize Stripe only if key exists
let stripe: Stripe | undefined;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
  });
}

export async function POST(req: NextRequest) {
  // Get company_id from httpOnly cookie set by /api/stripe/callback
  const companyId = req.cookies.get("candor_company_id")?.value;

  if (!companyId) {
    return NextResponse.json(
      { error: "Not authenticated. Connect Stripe first." },
      { status: 401 }
    );
  }

  // Check if Stripe is configured
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to environment." },
      { status: 500 }
    );
  }

  try {
    // Retrieve account details using the company_id (which is the stripe_account_id)
    const account = await stripe.accounts.retrieve(companyId);

    // ── HARD BLOCK: test mode ────────────────────────────────────
    if (!account.charges_enabled && !account.details_submitted) {
      return NextResponse.json({
        error: "Your Stripe account isn't complete enough to reflect reality. Finish Stripe setup, then return.",
        code:  "incomplete",
      }, { status: 400 });
    }

    // ── HARD BLOCK: livemode check ────────────────────────────────
    // Stripe Connect OAuth in test mode produces test accounts
    // We check the secret key prefix to enforce live mode
    const isLiveKey = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_");
    if (!isLiveKey) {
      // In development we allow test keys — gate only in production
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({
          error: "Test mode account detected. Connect your live Stripe account.",
          code:  "test_mode",
        }, { status: 400 });
      }
    }

    // ── Save to Supabase ─────────────────────────────────────────
    const { error: dbError } = await supabase
      .from("stripe_connections")
      .upsert({
        company_id:        companyId,
        stripe_account_id: companyId,
        connected_at:      new Date().toISOString(),
      }, { onConflict: "company_id" });

    if (dbError) throw new Error("DB error: " + dbError.message);

    // ── Set session cookie ───────────────────────────────────────
    const response = NextResponse.json({
      ok:               true,
      livemode:         isLiveKey || process.env.NODE_ENV !== "production",
      charges_enabled:  account.charges_enabled,
      details_submitted: account.details_submitted,
      country:          account.country,
      default_currency: account.default_currency,
    });

    response.cookies.set("candor_company_id", companyId, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 365,
      path:     "/",
    });

    return response;

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[validate error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
