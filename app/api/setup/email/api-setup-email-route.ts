import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ─── POST /api/setup/email ────────────────────────────────────────
// Saves founder's email to stripe_connections.
// Called once after Stripe connects, before /snapshot.

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Basic validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const companyId = req.cookies.get("candor_company_id")?.value;

    if (!companyId) {
      return NextResponse.json({ error: "No session found. Please reconnect Stripe." }, { status: 401 });
    }

    // Demo mode: just set cookie, no DB write needed
    if (companyId.startsWith("demo_")) {
      const res = NextResponse.json({ ok: true });
      res.cookies.set("candor_email", email, {
        httpOnly: false,
        secure:   process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge:   60 * 60 * 24 * 365,
        path:     "/",
      });
      return res;
    }

    // Live mode: save to Supabase
    const { error: dbError } = await supabase
      .from("stripe_connections")
      .update({ email: email.toLowerCase().trim() })
      .eq("company_id", companyId);

    if (dbError) throw new Error(dbError.message);

    // Cache in cookie for fast reads
    const res = NextResponse.json({ ok: true });
    res.cookies.set("candor_email", email.toLowerCase().trim(), {
      httpOnly: false,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 365,
      path:     "/",
    });

    return res;

  } catch (err: any) {
    console.error("[setup/email error]", err.message);
    return NextResponse.json(
      { error: "Failed to save: " + err.message },
      { status: 500 }
    );
  }
}
