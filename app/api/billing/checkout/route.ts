import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

// ─── POST /api/billing/checkout ───────────────────────────────────
// Creates a Stripe Checkout session and returns the URL.
// The client redirects to Stripe's hosted checkout page.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const companyId = req.cookies.get("candor_company_id")?.value;
  if (!companyId) {
    return NextResponse.json({ error: "No session." }, { status: 401 });
  }

  const { billing } = await req.json(); // "monthly" | "annual"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // ── Price IDs — create these in your Stripe dashboard ─────────
  // Dashboard → Products → Add product → "CEO Weekly Reality"
  // Add two prices: $99/month recurring + $999/year recurring
  const priceId = billing === "annual"
    ? process.env.STRIPE_PRICE_ANNUAL!   // price_xxx (annual)
    : process.env.STRIPE_PRICE_MONTHLY!; // price_xxx (monthly)

  if (!priceId) {
    return NextResponse.json(
      { error: `STRIPE_PRICE_${billing.toUpperCase()} not set in env vars` },
      { status: 500 }
    );
  }

  // ── Get founder email for Checkout pre-fill ────────────────────
  const { data: conn } = await supabase
    .from("stripe_connections")
    .select("email")
    .eq("company_id", companyId)
    .single();

  try {
    const session = await stripe.checkout.sessions.create({
      mode:               "subscription",
      payment_method_types: ["card"],
      line_items: [{
        price:    priceId,
        quantity: 1,
      }],
      // Pre-fill email if we have it
      ...(conn?.email ? { customer_email: conn.email } : {}),

      // Pass company_id through metadata so webhook can identify them
      subscription_data: {
        metadata: { company_id: companyId },
      },

      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/pricing`,

      // Allow promotion codes (optional — remove if you never discount)
      allow_promotion_codes: false,
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("[checkout error]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
