import { NextRequest, NextResponse } from "next/server";
import { runWeeklyJob } from "@/lib/weekly-job";

// ─── GET /api/cron/weekly ─────────────────────────────────────────
// Called by Vercel Cron every Sunday at 11pm UTC.
// Protected by CRON_SECRET — never expose this key.
//
// vercel.json config:
// {
//   "crons": [{
//     "path": "/api/cron/weekly",
//     "schedule": "0 23 * * 0"
//   }]
// }

export async function GET(req: NextRequest) {
  // ── Auth: verify cron secret ──────────────────────────────────
  const auth   = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("[cron] CRON_SECRET not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Run the job ───────────────────────────────────────────────
  try {
    const started = Date.now();
    const results = await runWeeklyJob();

    const sent    = results.filter(r => r.status === "sent").length;
    const failed  = results.filter(r => r.status === "failed").length;
    const skipped = results.filter(r => r.status === "skipped").length;
    const ms      = Date.now() - started;

    return NextResponse.json({
      ok:       true,
      ran_at:   new Date().toISOString(),
      duration: `${ms}ms`,
      sent,
      failed,
      skipped,
      results,
    });

  } catch (err: any) {
    console.error("[cron/weekly] Fatal error:", err.message);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
