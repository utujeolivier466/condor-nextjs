import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────
interface StripeConnectionRow {
  stripe_account_id: string;
  country: string | null;
  default_currency: string | null;
  connected_at: string | null;
  verified_at: string | null;
  trials: Array<{
    trial_started_at: string | null;
    emails_sent: number;
    status: string;
  }> | null;
  subscriptions: Array<{
    status: string | null;
    plan: string | null;
    activated_at: string | null;
  }> | null;
}

interface ShapedRow {
  stripe_account_id: string;
  country: string | null;
  default_currency: string | null;
  connected_at: string | null;
  verified_at: string | null;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  trial_state: "pre_trial" | "active" | "expired" | "paid";
  emails_sent: number;
  paid: boolean;
  subscription_status: string | null;
}

interface Stats {
  total: number;
  verified: number;
  trial_active: number;
  trial_expired: number;
  paid: number;
  completion_rate: string;
  completion_rate_raw: number;
  verify_rate: string;
  verify_rate_raw: number;
  conversion_rate: string;
  conversion_rate_raw: number;
}

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
    const shaped: ShapedRow[] = (rows || []).map((r: StripeConnectionRow) => {
      const trial  = r.trials?.[0];
      const sub    = r.subscriptions?.[0];
      const SEVEN  = 7 * 24 * 60 * 60 * 1000;

      const trialStartedAt = trial?.trial_started_at ?? null;
      const trialExpiresAt = trialStartedAt
        ? new Date(new Date(trialStartedAt).getTime() + SEVEN).toISOString()
        : null;

      const now = Date.now();
      let trialState: ShapedRow["trial_state"] = "pre_trial";
      
      if (sub?.status === "active") {
        trialState = "paid";
      } else if (!trialStartedAt) {
        trialState = "pre_trial";
      } else if (trialExpiresAt && now < new Date(trialExpiresAt).getTime()) {
        trialState = "active";
      } else {
        trialState = "expired";
      }

      return {
        stripe_account_id:   r.stripe_account_id,
        country:             r.country,
        default_currency:    r.default_currency,
        connected_at:        r.connected_at,
        verified_at:         r.verified_at,
        trial_started_at:    trialStartedAt,
        trial_expires_at:    trialExpiresAt,
        trial_state:         trialState,
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

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[admin/data error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
