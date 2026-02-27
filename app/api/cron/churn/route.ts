import { NextRequest, NextResponse } from "next/server";
import { runChurnEnforcement } from "@/lib/lib-churn-enforcement";

// ─── GET /api/cron/churn ──────────────────────────────────────────
// Runs daily at 9am UTC. Enforces churn rules.
// Cancels accounts that don't meet the bar.

export async function GET(req: NextRequest) {
  const auth   = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runChurnEnforcement();
    const cancelled = results.filter(r => r.action === "cancelled").length;
    const warned    = results.filter(r => r.action === "warned").length;

    return NextResponse.json({
      ok: true,
      ran_at: new Date().toISOString(),
      cancelled,
      warned,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
