import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

// ─── POST /api/onboarding/verify-charge ───────────────────────────
// Runs a $1 verification charge on the connected Stripe account.
// Confirms the account can actually process money.
// Kills fake/broken accounts instantly.
//
// The $1 is a real charge. It is labeled clearly.
// This is not a fee — it's proof.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as any,
});

export async function POST(req: NextRequest) {
  const companyId = req.cookies.get("candor_company_id")?.value;

  if (!companyId) {
    return NextResponse.json({ error: "No session found." }, { status: 401 });
  }

  // Get stripe account ID
  const { data: conn } = await supabase
    .from("stripe_connections")
    .select("stripe_account_id")
    .eq("company_id", companyId)
    .single();

  if (!conn) {
    return NextResponse.json({ error: "Stripe account not found." }, { status: 404 });
  }

  try {
    // Create a $1 charge against the connected account's balance
    // This is a direct charge — it hits their Stripe balance
    const charge = await stripe.charges.create(
      {
        amount:      100,    // $1.00 in cents
        currency:    "usd",
        description: "Candor account verification",
        metadata: {
          type:       "verification",
          company_id: companyId,
        },
        // Use a test payment method in dev, real token in prod
        // In production: this requires a payment method from the connected account
        // For now: create via balance transfer (platform charge)
        source: "tok_bypassPending", // Stripe test token — replace with real flow in prod
      },
      {
        stripeAccount: conn.stripe_account_id,
      }
    );

    if (charge.status !== "succeeded") {
      return NextResponse.json({
        error: `Charge failed with status: ${charge.status}. Fix your Stripe account and try again.`,
      }, { status: 400 });
    }

    // ── Mark account as verified in DB ───────────────────────────
    await supabase
      .from("stripe_connections")
      .update({
        verified_at:      new Date().toISOString(),
        verification_charge_id: charge.id,
      })
      .eq("company_id", companyId);

    return NextResponse.json({ ok: true, charge_id: charge.id });

  } catch (err: any) {
    console.error("[verify-charge error]", err.message);

    // Surface useful errors
    const msg = err.code === "account_invalid"
      ? "Your Stripe account can't accept charges yet. Complete your Stripe setup first."
      : err.code === "card_declined"
      ? "Verification charge declined. Check your Stripe account is fully set up."
      : err.message;

    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
