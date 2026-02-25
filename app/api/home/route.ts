import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ─── GET /api/home ────────────────────────────────────────────────
// Returns trial status, last email sent, next email scheduled.
// Powers the /home page.

export async function GET(req: NextRequest) {
  const companyId = req.cookies.get("candor_company_id")?.value;

  if (!companyId) {
    return NextResponse.json({ error: "No session." }, { status: 401 });
  }

  try {
    // ── Get trial record ─────────────────────────────────────────
    const { data: trial } = await supabase
      .from("trials")
      .select("*")
      .eq("company_id", companyId)
      .single();

    // ── Get latest snapshot for health score ─────────────────────
    const { data: snapshot } = await supabase
      .from("snapshots")
      .select("health_score, computed_at")
      .eq("company_id", companyId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .single();

    // ── Get latest email sent ─────────────────────────────────────
    const { data: lastEmail } = await supabase
      .from("emails_sent")
      .select("sent_at, subject, constraint_text")
      .eq("company_id", companyId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      last_email_at:   lastEmail?.sent_at   ?? null,
      last_subject:    lastEmail?.subject   ?? null,
      last_constraint: lastEmail?.constraint_text ?? null,
      next_email_at:   trial?.next_email_at ?? null,
      emails_sent:     trial?.emails_sent   ?? 0,
      health_score:    snapshot?.health_score ?? null,
    });

  } catch (err: any) {
    console.error("[home api error]", err.message);
    return NextResponse.json({
      last_email_at:   null,
      last_subject:    null,
      last_constraint: null,
      next_email_at:   null,
      emails_sent:     0,
      health_score:    null,
    });
  }
}
