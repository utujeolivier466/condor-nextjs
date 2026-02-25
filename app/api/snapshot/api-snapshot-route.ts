import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

// ─── GET /api/snapshot ────────────────────────────────────────────
// Pulls last 30d vs previous 30d revenue from Stripe.
// Saves result to snapshots table.
// Works for both real and demo connections.

export async function GET(req: NextRequest) {
  const companyId = req.cookies.get("candor_company_id")?.value;

  if (!companyId) {
    return NextResponse.json(
      { error: "No Stripe connection found. Please reconnect." },
      { status: 401 }
    );
  }

  // ── Demo mode ─────────────────────────────────────────────────
  if (companyId.startsWith("demo_")) {
    const raw = req.cookies.get("candor_demo_data")?.value;
    if (!raw) {
      return NextResponse.json({ error: "Demo session expired." }, { status: 401 });
    }
    const demo         = JSON.parse(raw);
    const current_30d  = demo.demo_mrr;
    const previous_30d = Math.round(demo.demo_mrr * (demo.nrr / 100));
    const pct_change   = ((current_30d - previous_30d) / previous_30d) * 100;

    return NextResponse.json({
      current_30d,
      previous_30d,
      pct_change: Math.round(pct_change * 10) / 10,
      is_demo:    true,
    });
  }

  // ── Live mode ─────────────────────────────────────────────────
  try {
    // Look up stripe_account_id from Supabase
    const { data: connection, error: dbError } = await supabase
      .from("stripe_connections")
      .select("stripe_account_id, monthly_burn")
      .eq("company_id", companyId)
      .single();

    if (dbError || !connection) {
      return NextResponse.json(
        { error: "Connection not found. Please reconnect Stripe." },
        { status: 404 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover" as any,
    });

    const now          = Math.floor(Date.now() / 1000);
    const day30        = 60 * 60 * 24 * 30;
    const current_start  = now - day30;
    const previous_start = now - day30 * 2;

    // Fetch both periods in parallel
    const [currentCharges, previousCharges] = await Promise.all([
      fetchAllCharges(stripe, connection.stripe_account_id, current_start, now),
      fetchAllCharges(stripe, connection.stripe_account_id, previous_start, current_start),
    ]);

    const current_30d  = sumCharges(currentCharges);
    const previous_30d = sumCharges(previousCharges);
    const pct_change   = previous_30d === 0
      ? 100
      : ((current_30d - previous_30d) / previous_30d) * 100;

    // ── Save snapshot to Supabase ──────────────────────────────
    await supabase.from("snapshots").insert({
      company_id:   companyId,
      computed_at:  new Date().toISOString(),
      new_net_arr:  current_30d - previous_30d,
      // Other metrics computed after burn input
    });

    return NextResponse.json({
      current_30d,
      previous_30d,
      pct_change: Math.round(pct_change * 10) / 10,
      is_demo:    false,
    });

  } catch (err: any) {
    console.error("[Snapshot error]", err.message);
    return NextResponse.json(
      { error: "Failed to load Stripe data: " + err.message },
      { status: 500 }
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────
async function fetchAllCharges(
  stripe: Stripe,
  stripeAccountId: string,
  from: number,
  to: number
): Promise<Stripe.Charge[]> {
  const charges: Stripe.Charge[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const batch = await stripe.charges.list(
      {
        created: { gte: from, lte: to },
        limit:   100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
      { stripeAccount: stripeAccountId }
    );
    charges.push(...batch.data);
    hasMore       = batch.has_more;
    startingAfter = batch.data[batch.data.length - 1]?.id;
  }

  return charges;
}

function sumCharges(charges: Stripe.Charge[]): number {
  return charges
    .filter(c => c.status === "succeeded" && !c.refunded)
    .reduce((sum, c) => sum + c.amount, 0) / 100;
}
