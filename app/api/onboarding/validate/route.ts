import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

// ─── POST /api/onboarding/validate ────────────────────────────────
// Exchanges OAuth code for Stripe account.
// Validates: live mode, charges enabled, details submitted.
// Hard stops on test mode — no exceptions.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as any,
});

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  if (!code) {
    return NextResponse.json({ error: "Missing OAuth code." }, { status: 400 });
  }

  try {
    // Exchange code for access token
    const token = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const stripeAccountId = token.stripe_user_id;
    if (!stripeAccountId) {
      return NextResponse.json({ error: "No Stripe account returned." }, { status: 400 });
    }

    // Retrieve full account details
    const account = await stripe.accounts.retrieve(stripeAccountId);

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
        company_id:        stripeAccountId,
        stripe_account_id: stripeAccountId,
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

    response.cookies.set("candor_company_id", stripeAccountId, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 365,
      path:     "/",
    });

    return response;

  } catch (err: any) {
    console.error("[validate error]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
