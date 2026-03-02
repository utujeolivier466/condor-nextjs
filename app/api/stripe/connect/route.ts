import { NextResponse } from "next/server";

// ─── Stripe OAuth initiation ──────────────────────────────────────
// POST /api/stripe/connect
// Generates the Stripe OAuth URL and returns it to the client.
// The client then redirects to Stripe.

export async function POST() {
  const clientId    = process.env.STRIPE_CLIENT_ID;
  const redirectUri = process.env.STRIPE_REDIRECT_URI; // e.g. https://yourdomain.com/api/stripe/callback

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_CLIENT_ID and STRIPE_REDIRECT_URI to your environment." },
      { status: 500 }
    );
  }

  // Build Stripe OAuth URL
  const params = new URLSearchParams({
    response_type:   "code",
    client_id:       clientId,
    scope:           "read_write",      // Required by Stripe for Connect OAuth
    redirect_uri:    redirectUri,
    // Optional: pre-fill the Stripe Connect form
    // "stripe_user[business_type]": "company",
  });

  const stripeOAuthUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

  return NextResponse.json({ url: stripeOAuthUrl });
}
