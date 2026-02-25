import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// ─── GET /api/snapshot ───────────────────────────────────────────
// Returns the Net Revenue Retention (NRR) snapshot for the last 30 days.
// Requires candor_company_id cookie (set after Stripe OAuth).

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("candor_company_id")?.value;

  // If no company ID, return demo data
  if (!companyId) {
    return NextResponse.json({
      current_30d: 12500,
      previous_30d: 11200,
      pct_change: 11.6,
      is_demo: true,
    });
  }

  // TODO: Replace with actual DB queries to Stripe
  // For now, return mock data based on the company ID
  // In production, query your database for the actual Stripe data
  
  // Example real implementation:
  // const connection = await db.query('SELECT stripe_account_id FROM stripe_connections WHERE company_id = ?', [companyId]);
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  // const balance = await stripe.balance.retrieve({ stripeAccount: connection.stripe_account_id });
  // ... calculate NRR ...

  return NextResponse.json({
    current_30d: 12500,
    previous_30d: 11200,
    pct_change: 11.6,
    is_demo: false,
  });
}
