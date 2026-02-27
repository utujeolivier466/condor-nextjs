import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ─── middleware.ts ────────────────────────────────────────────────
// Runs on every request. Enforces paywall on protected routes.
// Place in repo ROOT (same level as app/, not inside app/).
//
// Protected routes — require active subscription:
//   /home, /snapshot (after first free view), /email-preview (after first send)
//
// Free routes — always accessible:
//   /, /connect-stripe, /setup, /burn-input, /pricing, /api/*

export const config = {
  matcher: ["/home", "/snapshot", "/email-preview"],
};

export async function middleware(req: NextRequest) {
  const companyId = req.cookies.get("candor_company_id")?.value;

  // No session → kick to connect
  if (!companyId) {
    return NextResponse.redirect(new URL("/connect-stripe", req.url));
  }

  // Demo accounts get full access (they never pay)
  if (companyId.startsWith("demo_")) {
    return NextResponse.next();
  }

  // Check subscription status in Supabase
  try {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("company_id", companyId)
      .single();

    // Active or in good standing → allow through
    if (sub?.status === "active") {
      return NextResponse.next();
    }

    // Past due → allow /home (read-only) but block email-preview
    if (sub?.status === "past_due") {
      if (req.nextUrl.pathname === "/email-preview") {
        return NextResponse.redirect(new URL("/pricing?reason=past_due", req.url));
      }
      return NextResponse.next(); // read-only access to /home, /snapshot
    }

    // No subscription or cancelled → paywall
    // Allow one free /snapshot view (the hook)
    const hasSeenSnapshot = req.cookies.get("candor_snapshot_seen")?.value;
    if (req.nextUrl.pathname === "/snapshot" && !hasSeenSnapshot) {
      const res = NextResponse.next();
      res.cookies.set("candor_snapshot_seen", "true", {
        httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: "/",
      });
      return res;
    }

    // Everything else → pricing page
    return NextResponse.redirect(new URL("/pricing", req.url));

  } catch {
    // DB error → fail open (don't block users on infra issues)
    return NextResponse.next();
  }
}
