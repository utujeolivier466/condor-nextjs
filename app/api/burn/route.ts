import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

// ─── POST /api/burn ───────────────────────────────────────────────
// Saves monthly burn to Supabase stripe_connections table.
// Only manual input in the product. Ever.

export async function POST(req: NextRequest) {
  try {
    const body         = await req.json();
    const monthly_burn = parseFloat(body.monthly_burn);

    if (!monthly_burn || isNaN(monthly_burn) || monthly_burn <= 0) {
      return NextResponse.json({ error: "Invalid burn amount." }, { status: 400 });
    }

    const cookieStore  = await cookies();
    const companyId     = cookieStore.get("candor_company_id")?.value;

    // ── Demo mode: just set cookie, no DB needed ─────────────────
    if (!companyId || companyId.startsWith("demo_")) {
      const response = NextResponse.json({ ok: true });
      response.cookies.set("candor_monthly_burn", String(monthly_burn), {
        httpOnly: true,
        secure:   process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge:   60 * 60 * 24 * 365,
        path:     "/",
      });
      return response;
    }

    // ── Live mode: save to Supabase ──────────────────────────────
    const { error: dbError } = await supabase
      .from("stripe_connections")
      .update({ monthly_burn })
      .eq("company_id", companyId);

    if (dbError) throw new Error(dbError.message);

    // Also set cookie as fast-read cache
    const response = NextResponse.json({ ok: true });
    response.cookies.set("candor_monthly_burn", String(monthly_burn), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 365,
      path:     "/",
    });

    return response;

  } catch (err: any) {
    console.error("[burn route error]", err.message);
    return NextResponse.json(
      { error: "Failed to save: " + err.message },
      { status: 500 }
    );
  }
}
