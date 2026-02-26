import { NextRequest, NextResponse } from "next/server";

// ─── GET /api/cron/trigger ───────────────────────────────────────
// Manual trigger for the weekly email job (for testing).
// In production, this would be called by Vercel Cron.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  
  // Simple auth check - in production use proper auth
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Import the weekly job dynamically to avoid initialization issues
    const { runWeeklyJob } = await import("@/lib/lib-weekly-job");
    
    const result = await runWeeklyJob();
    
    return NextResponse.json({ 
      ok: true, 
      processed: result.length,
      companies: result 
    });
  } catch (err: any) {
    console.error("[cron trigger error]", err.message);
    return NextResponse.json(
      { error: "Failed to run job: " + err.message },
      { status: 500 }
    );
  }
}
