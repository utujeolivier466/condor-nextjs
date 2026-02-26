import { NextRequest, NextResponse } from "next/server";

// ─── GET /api/cron/weekly ─────────────────────────────────────────
// Weekly cron job - runs every Sunday at 11pm UTC
// Processes all active trials and sends emails

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  
  // Simple auth check
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { runWeeklyJob } = await import("@/lib/lib-weekly-job");
    
    const result = await runWeeklyJob();
    
    return NextResponse.json({ 
      ok: true, 
      processed: result.length,
      companies: result 
    });
  } catch (err: any) {
    console.error("[cron weekly error]", err.message);
    return NextResponse.json(
      { error: "Failed to run job: " + err.message },
      { status: 500 }
    );
  }
}
