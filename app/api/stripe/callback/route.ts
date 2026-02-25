import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

// ─── Stripe OAuth callback ────────────────────────────────────────
// GET /api/stripe/callback?code=xxx
// Called by Stripe after the founder authorizes.
// Exchanges code → stripe_account_id, saves to DB, redirects to /snapshot.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover" as any,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  // ── User denied access ──────────────────────────────────────────
  if (error) {
    return NextResponse.redirect(
      new URL(`/connect-stripe?error=${encodeURIComponent("Access denied. Connect Stripe to continue.")}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/connect-stripe?error=missing_code", req.url));
  }

  try {
    // ── Exchange code for Stripe account ID ─────────────────────
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const stripeAccountId = response.stripe_user_id;
    if (!stripeAccountId) throw new Error("No Stripe account ID returned.");

    const companyId = stripeAccountId; // Use Stripe account ID as company ID

    // ── Save to Supabase ─────────────────────────────────────────
    const { error: dbError } = await supabase
      .from("stripe_connections")
      .upsert({
        company_id:        companyId,
        stripe_account_id: stripeAccountId,
        connected_at:      new Date().toISOString(),
      }, { onConflict: "company_id" });

    if (dbError) throw new Error("DB error: " + dbError.message);

    // ── Redirect immediately to /snapshot ───────────────────────
    // No welcome screen. No "thanks for connecting." Instant value.
    const res = NextResponse.redirect(new URL("/snapshot", req.url));

    // Store company_id in cookie so /snapshot can identify the user
    res.cookies.set("candor_company_id", companyId, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 365, // 1 year
      path:     "/",
    });

    return res;

  } catch (err: any) {
    console.error("[Stripe callback error]", err.message);
    return NextResponse.redirect(
      new URL(`/connect-stripe?error=${encodeURIComponent("Connection failed: " + err.message)}`, req.url)
    );
  }
}
