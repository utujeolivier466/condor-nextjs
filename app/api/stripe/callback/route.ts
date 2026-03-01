import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

// ─── Stripe OAuth callback ────────────────────────────────────────
// GET /api/stripe/callback?code=xxx
// Called by Stripe after the founder authorizes.
// Exchanges code → stripe_account_id, saves to DB, redirects to /onboarding.

let stripe: Stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("[Stripe callback] STRIPE_SECRET_KEY not configured");
  } else {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20" as any,
    });
  }
} catch (e) {
  console.error("[Stripe callback] Failed to initialize Stripe:", e);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  // ── User denied access ──────────────────────────────────────────
  if (error) {
    return NextResponse.redirect(
      new URL(`/onboarding?error=${encodeURIComponent("Access denied. Connect Stripe to continue.")}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/onboarding?error=missing_code", req.url));
  }

  // ── Check Stripe is configured ─────────────────────────────────
  if (!stripe) {
    return NextResponse.redirect(
      new URL(`/onboarding?error=${encodeURIComponent("Stripe is not configured. Please contact support.")}`, req.url)
    );
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

    if (dbError) {
      console.error("[Stripe callback] DB Error:", dbError.message);
      // If it's a table not found error, redirect with helpful message
      if (dbError.message.includes("relation") || dbError.message.includes("table")) {
        return NextResponse.redirect(
          new URL(`/onboarding?error=${encodeURIComponent("Database not set up. Please run the schema.sql in Supabase.")}`, req.url)
        );
      }
      throw new Error("DB error: " + dbError.message);
    }

    // ── Redirect to /onboarding for validation (Step 2) ───────────
    const res = NextResponse.redirect(new URL(`/onboarding?code=${code}`, req.url));

    // Store company_id in cookie so onboarding can validate
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
      new URL(`/onboarding?error=${encodeURIComponent("Connection failed: " + err.message)}`, req.url)
    );
  }
}
