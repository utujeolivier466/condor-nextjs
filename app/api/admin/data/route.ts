import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ─── GET /api/admin/data ──────────────────────────────────────────
// Internal only. Password protected.
// Returns all account data for the admin observatory.
// Never expose ADMIN_SECRET in client code.

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────
  const provided = req.headers.get("x-admin-pass");
  const secret   = process.env.ADMIN_SECRET;

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── Pull all accounts with trial + subscription state ────────
    const { data: rows, error } = await supabase
      .from("stripe_connections")
      .select(`
        stripe_account_id,
        country,
        default_currency,
        connected_at,
        verified_at,
        trials (
          trial_started_at,
          emails_sent,
          status
        ),
        subscriptions (
          status,
          plan,
          activated_at
        )
      `)
      .order("connected_at", { ascending: false });

    if (error) throw error;

    // ── Shape the data ────────────────────────────────────────
    const shaped = (rows || []).map((r: any) => {
      const trial  = r.trials?.[0];
      const sub    = r.subscriptions?.[0];
      const SEVEN  = 7 * 24 * 60 * 60 * 1000;

      const trial_started_at = trial?.trial_started_at ?? null;
      const trial_expires_at = trial_started_at
        ? new Date(new Date(trial_started_at).getTime() + SEVEN).toISOString()
        : null;

      const now = Date.now();
      const trial_state =
        sub?.status === "active" ? "paid" :
        !trial_started_at        ? "pre_trial" :
        now < new Date(trial_expires_at!).getTime() ? "active" : "expired";

      return {
        stripe_account_id:   r.stripe_account_id,
        country:             r.country,
        default_currency:    r.default_currency,
        connected_at:        r.connected_at,
        verified_at:         r.verified_at,
        trial_started_at,
        trial_expires_at,
        trial_state,
        emails_sent:         trial?.emails_sent ?? 0,
        paid:                sub?.status === "active",
        subscription_status: sub?.status ?? null,
      };
    });

    // ── Compute stats ─────────────────────────────────────────
    const total         = shaped.length;
    const verified      = shaped.filter(r => r.verified_at).length;
    const trial_active  = shaped.filter(r => r.trial_state === "active").length;
    const trial_expired = shaped.filter(r => r.trial_state === "expired").length;
    const paid          = shaped.filter(r => r.paid).length;

    const completion_rate_raw = total > 0 ? Math.round((verified / total) * 100) : 0;
    const verify_rate_raw     = total > 0 ? Math.round((verified / total) * 100) : 0;
    const trialed             = shaped.filter(r => r.trial_started_at).length;
    const conversion_rate_raw = trialed > 0 ? Math.round((paid / trialed) * 100) : 0;

    const stats = {
      total,
      verified,
      trial_active,
      trial_expired,
      paid,
      completion_rate:     `${completion_rate_raw}%`,
      completion_rate_raw,
      verify_rate:         `${verify_rate_raw}%`,
      verify_rate_raw,
      conversion_rate:     `${conversion_rate_raw}%`,
      conversion_rate_raw,
    };

    return NextResponse.json({ rows: shaped, stats });

  } catch (err: any) {
    console.error("[admin/data error]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
