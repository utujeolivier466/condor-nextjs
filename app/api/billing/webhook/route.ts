import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

// ─── POST /api/billing/webhook ────────────────────────────────────
// Stripe calls this for every billing event.
// This is the source of truth for who is paying.
//
// Add in Stripe dashboard → Webhooks → Add endpoint:
//   URL: https://yourapp.vercel.app/api/billing/webhook
//   Events to listen: checkout.session.completed
//                     customer.subscription.deleted
//                     invoice.payment_failed

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature." }, { status: 400 });
  }

  // ── Verify webhook signature ───────────────────────────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("[webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // ── Handle events ─────────────────────────────────────────────
  try {
    switch (event.type) {

      // ── Payment succeeded → activate subscription ─────────────
      case "checkout.session.completed": {
        const session   = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.company_id;

        if (!companyId) {
          console.warn("[webhook] checkout.session.completed — no company_id in metadata");
          break;
        }

        await supabase
          .from("subscriptions")
          .upsert({
            company_id:              companyId,
            stripe_subscription_id:  session.subscription as string,
            stripe_customer_id:      session.customer as string,
            status:                  "active",
            plan:                    session.amount_total === 9900 ? "monthly" : "annual",
            activated_at:            new Date().toISOString(),
            current_period_end:      null, // updated on invoice events
          }, { onConflict: "company_id" });

        console.log(`[webhook] ✓ Activated: ${companyId}`);
        break;
      }

      // ── Subscription cancelled → deactivate ───────────────────
      case "customer.subscription.deleted": {
        const sub       = event.data.object as Stripe.Subscription;
        const companyId = sub.metadata?.company_id;

        if (!companyId) break;

        await Promise.all([
          supabase
            .from("subscriptions")
            .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
            .eq("company_id", companyId),

          // Pause the trial — no more emails
          supabase
            .from("trials")
            .update({ status: "cancelled" })
            .eq("company_id", companyId),
        ]);

        console.log(`[webhook] ✓ Cancelled: ${companyId}`);
        break;
      }

      // ── Payment failed → mark as past_due ─────────────────────
      case "invoice.payment_failed": {
        const invoice   = event.data.object as Stripe.Invoice;
        // @ts-expect-error - subscription property may not exist in newer Stripe API
        const subId     = invoice.subscription as string | null;

        if (!subId) break;

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("company_id")
          .eq("stripe_subscription_id", subId)
          .single();

        if (sub?.company_id) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("company_id", sub.company_id);

          console.log(`[webhook] ⚠ Payment failed: ${sub.company_id}`);
        }
        break;
      }

      default:
        // Ignore unhandled events — don't error on them
        break;
    }

    return NextResponse.json({ received: true });

  } catch (err: any) {
    console.error("[webhook] Handler error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
