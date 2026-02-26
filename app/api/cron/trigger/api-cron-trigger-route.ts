import { NextRequest, NextResponse } from "next/server";
import { processCompany } from "@/lib/weekly-job";

// ─── POST /api/cron/trigger ───────────────────────────────────────
// Manual trigger for a single company. Use this to test without
// waiting for Sunday. Remove or protect in production.
//
// Usage:
//   curl -X POST https://yourapp.com/api/cron/trigger \
//     -H "Authorization: Bearer YOUR_CRON_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{"company_id": "acct_xxx"}'

export async function POST(req: NextRequest) {
  const auth   = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { company_id } = await req.json();

  if (!company_id) {
    return NextResponse.json({ error: "company_id required" }, { status: 400 });
  }

  try {
    const result = await processCompany(company_id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
