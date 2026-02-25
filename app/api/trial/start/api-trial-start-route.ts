import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ─── POST /api/trial/start ────────────────────────────────────────
// Marks the trial as started.
// Schedules the weekly email job.
// Called on "Start trial" click → redirects to /home.

export async function POST(req: NextRequest) {
  const companyId = req.cookies.get("candor_company_id")?.value;

  if (!companyId) {
    return NextResponse.json({ error: "No session." }, { status: 401 });
  }

  try {
    const now          = new Date();
    const nextMonday   = getNextMonday(now);

    // ── Upsert trial record ──────────────────────────────────────
    const { error: dbError } = await supabase
      .from("trials")
      .upsert({
        company_id:       companyId,
        started_at:       now.toISOString(),
        next_email_at:    nextMonday.toISOString(),
        status:           "active",
        emails_sent:      0,
      }, { onConflict: "company_id" });

    if (dbError) throw new Error(dbError.message);

    // ── Set cookie so /home knows trial is active ────────────────
    const response = NextResponse.json({ ok: true, next_email_at: nextMonday.toISOString() });

    response.cookies.set("candor_trial_active", "true", {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 365,
      path:     "/",
    });

    response.cookies.set("candor_next_email", nextMonday.toISOString(), {
      httpOnly: false, // readable by client for display
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 7,
      path:     "/",
    });

    return response;

  } catch (err: any) {
    console.error("[trial/start error]", err.message);
    // Don't block — still redirect to /home
    return NextResponse.json({ ok: true, error: err.message });
  }
}

// ─── Get next Monday at 6am UTC ───────────────────────────────────
function getNextMonday(from: Date): Date {
  const d    = new Date(from);
  const day  = d.getUTCDay(); // 0=Sun, 1=Mon...
  const diff = day === 1 ? 7 : (8 - day) % 7 || 7; // days until next Monday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(6, 0, 0, 0); // 6am UTC
  return d;
}
