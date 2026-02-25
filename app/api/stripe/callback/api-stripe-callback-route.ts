import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

// ─── GET /api/stripe/callback ─────────────────────────────────────
// Stripe redirects here after OAuth. Saves connection to Supabase.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover" as any,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    const msg = encodeURIComponent("Access denied. Connect Stripe to continue.");
    return NextResponse.redirect(new URL(`/connect-stripe?error=${msg}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/connect-stripe?error=missing_code", req.url));
  }

  try {
    // ── Exchange code for Stripe account ID ──────────────────────
    const token = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const stripeAccountId = token.stripe_user_id;
    if (!stripeAccountId) throw new Error("No Stripe account ID returned.");

    const companyId = stripeAccountId; // use Stripe account ID as company ID

    // ── Save to Supabase ─────────────────────────────────────────
    const { error: dbError } = await supabase
      .from("stripe_connections")
      .upsert({
        company_id:        companyId,
        stripe_account_id: stripeAccountId,
        connected_at:      new Date().toISOString(),
      }, { onConflict: "company_id" });

    if (dbError) throw new Error("DB error: " + dbError.message);

    // ── Set session cookie + redirect ────────────────────────────
    const res = NextResponse.redirect(new URL("/snapshot", req.url));
    res.cookies.set("candor_company_id", companyId, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 365,
      path:     "/",
    });

    return res;

  } catch (err: any) {
    console.error("[Stripe callback error]", err.message);
    const msg = encodeURIComponent("Connection failed: " + err.message);
    return NextResponse.redirect(new URL(`/connect-stripe?error=${msg}`, req.url));
  }
}
