import { NextRequest, NextResponse } from "next/server";

// ─── middleware.ts ──────────────────────────────────────────────
// Simple middleware without external imports to avoid build issues

export const config = {
  matcher: [
    "/snapshot",
    "/burn-input", 
    "/email-preview",
    "/home",
    "/reality-lock",
  ],
};

export async function middleware(req: NextRequest) {
  const companyId = req.cookies.get("candor_company_id")?.value;
  const path = req.nextUrl.pathname;

  // No companyId = redirect to home
  if (!companyId) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Demo accounts: redirect to onboarding
  if (companyId.startsWith("demo_")) {
    const res = NextResponse.redirect(new URL("/onboarding", req.url));
    res.cookies.delete("candor_company_id");
    res.cookies.delete("candor_demo_data");
    return res;
  }

  // Allow access by default - trial checks will happen in page components
  return NextResponse.next();
}
