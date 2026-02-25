import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// ─── POST /api/burn ───────────────────────────────────────────────
// Saves the founder's monthly burn. Only manual input in the product.
// Needed to compute Burn Multiple + Runway.

export async function POST(req: NextRequest) {
  const { monthly_burn } = await req.json();

  if (!monthly_burn || monthly_burn <= 0) {
    return NextResponse.json({ error: "Invalid burn amount." }, { status: 400 });
  }

  const cookieStore  = await cookies();
  const companyId    = cookieStore.get("candor_company_id")?.value;

  // For demo purposes, allow saving without company ID
  // In production, this would require authentication
  if (!companyId) {
    // Save to cookie anyway for demo mode
    cookieStore.set("candor_monthly_burn", String(monthly_burn), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 365,
      path:     "/",
    });
    
    return NextResponse.json({ ok: true, demo: true });
  }

  // Save burn to cookie (replace with DB upsert when ready)
  // DB: UPDATE stripe_connections SET monthly_burn = $1 WHERE company_id = $2
  cookieStore.set("candor_monthly_burn", String(monthly_burn), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 365,
    path:     "/",
  });

  return NextResponse.json({ ok: true });
}
