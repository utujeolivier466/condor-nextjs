import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

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

    // ── Save to DB ───────────────────────────────────────────────
    // Only the three fields that matter. Nothing else.
    await saveConnection({
      company_id:        generateCompanyId(),   // replace with your auth session ID
      stripe_account_id: stripeAccountId,
      connected_at:      new Date().toISOString(),
    });

    // ── Redirect immediately to /snapshot ───────────────────────
    // No welcome screen. No "thanks for connecting." Instant value.
    const res = NextResponse.redirect(new URL("/snapshot", req.url));

    // Store company_id in cookie so /snapshot can identify the user
    res.cookies.set("candor_company_id", stripeAccountId, {
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
      new URL(`/connect-stripe?error=${encodeURIComponent("Connection failed. Try again.")}`, req.url)
    );
  }
}

// ─── DB: Save Stripe connection ───────────────────────────────────
// Replace this with your actual DB client (Prisma, Supabase, Drizzle, etc.)
async function saveConnection({
  company_id,
  stripe_account_id,
  connected_at,
}: {
  company_id: string;
  stripe_account_id: string;
  connected_at: string;
}) {
  // ── Prisma example ──
  // await prisma.stripeConnection.upsert({
  //   where:  { company_id },
  //   update: { stripe_account_id, connected_at },
  //   create: { company_id, stripe_account_id, connected_at },
  // });

  // ── Supabase example ──
  // const { error } = await supabase
  //   .from("stripe_connections")
  //   .upsert({ company_id, stripe_account_id, connected_at });
  // if (error) throw error;

  // ── Raw log for now (replace before shipping) ──
  console.log("[Stripe connected]", { company_id, stripe_account_id, connected_at });
}

// ─── Temporary: generate company ID ──────────────────────────────
// Replace with your actual auth session lookup.
function generateCompanyId(): string {
  return `company_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
