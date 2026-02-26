import Stripe from "stripe";
import { supabase } from "./supabase";

// ─── lib/compute.ts ───────────────────────────────────────────────
// Pulls real Stripe data. Computes the 5 numbers.
// Ugly but directionally correct. That's the spec.

export type Metrics = {
  nrr:                number | null;  // %
  new_net_arr:        number | null;  // $ last 30d
  burn_multiple:      number | null;  // x
  core_action_conv:   number | null;  // % (mocked V1)
  forward_signal:     "STRONG" | "STABLE" | "AT_RISK" | null;
  insufficient:       string[];       // metrics we couldn't compute
};

export type RevenueData = {
  current_30d:   number;
  previous_30d:  number;
  new_revenue:   number;  // new customers revenue
  churned:       number;  // lost revenue
  monthly_burn:  number;
};

// ─── Main: compute all metrics for a company ─────────────────────
export async function computeMetrics(companyId: string): Promise<Metrics> {
  const insufficient: string[] = [];

  // 1. Load connection from DB
  const { data: conn } = await supabase
    .from("stripe_connections")
    .select("stripe_account_id, monthly_burn")
    .eq("company_id", companyId)
    .single();

  if (!conn) throw new Error("Company not found: " + companyId);

  const monthly_burn = conn.monthly_burn ?? 0;

  // 2. Pull Stripe revenue
  let revenue: RevenueData;
  try {
    revenue = await pullStripeRevenue(conn.stripe_account_id, monthly_burn);
  } catch (err: any) {
    throw new Error("Stripe pull failed: " + err.message);
  }

  // 3. NRR — Net Revenue Retention
  // NRR = (previous MRR + expansion - contraction - churn) / previous MRR * 100
  let nrr: number | null = null;
  if (revenue.previous_30d > 0) {
    const retained = revenue.current_30d - revenue.new_revenue;
    nrr = Math.round((retained / revenue.previous_30d) * 100 * 10) / 10;
  } else {
    insufficient.push("NRR");
  }

  // 4. New Net ARR — (current - previous) annualized
  let new_net_arr: number | null = null;
  if (revenue.current_30d !== null && revenue.previous_30d !== null) {
    new_net_arr = Math.round((revenue.current_30d - revenue.previous_30d) * 12);
  } else {
    insufficient.push("New Net ARR");
  }

  // 5. Burn Multiple — burn / new net ARR
  let burn_multiple: number | null = null;
  if (monthly_burn > 0 && new_net_arr && new_net_arr > 0) {
    burn_multiple = Math.round((monthly_burn / (new_net_arr / 12)) * 10) / 10;
  } else if (monthly_burn === 0) {
    insufficient.push("Burn Multiple"); // no burn input
  } else {
    burn_multiple = null; // negative new ARR — still show as null
  }

  // 6. Core Action Conversion — MOCKED V1
  // Real implementation requires product event tracking (coming in V2)
  const core_action_conv: number | null = null;
  insufficient.push("Core Action Conversion"); // honest: no data yet

  // 7. Forward Signal — derived from NRR trend + new ARR direction
  let forward_signal: Metrics["forward_signal"] = null;
  if (nrr !== null && new_net_arr !== null) {
    if (nrr >= 110 && new_net_arr > 0)        forward_signal = "STRONG";
    else if (nrr >= 100 && new_net_arr >= 0)  forward_signal = "STABLE";
    else                                       forward_signal = "AT_RISK";
  } else {
    insufficient.push("Forward Signal");
  }

  return {
    nrr,
    new_net_arr,
    burn_multiple,
    core_action_conv,
    forward_signal,
    insufficient,
  };
}

// ─── Pull Stripe revenue for 30d + previous 30d ──────────────────
async function pullStripeRevenue(
  stripeAccountId: string,
  monthlyBurn: number
): Promise<RevenueData> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20" as any,
  });

  const now          = Math.floor(Date.now() / 1000);
  const day30        = 60 * 60 * 24 * 30;
  const curr_start   = now - day30;
  const prev_start   = now - day30 * 2;

  const [currCharges, prevCharges] = await Promise.all([
    fetchAllCharges(stripe, stripeAccountId, curr_start, now),
    fetchAllCharges(stripe, stripeAccountId, prev_start, curr_start),
  ]);

  const current_30d  = sumCharges(currCharges);
  const previous_30d = sumCharges(prevCharges);

  // Identify new vs returning customers
  const prevCustomers = new Set(prevCharges.filter(c => c.status === "succeeded").map(c => c.customer));
  const newRevenue    = currCharges
    .filter(c => c.status === "succeeded" && !c.refunded && !prevCustomers.has(c.customer))
    .reduce((s, c) => s + c.amount, 0) / 100;

  // Churned = customers who paid last period but not this period
  const currCustomers = new Set(currCharges.filter(c => c.status === "succeeded").map(c => c.customer));
  const churnedRevenue = prevCharges
    .filter(c => c.status === "succeeded" && !c.refunded && !currCustomers.has(c.customer))
    .reduce((s, c) => s + c.amount, 0) / 100;

  return {
    current_30d,
    previous_30d,
    new_revenue:  newRevenue,
    churned:      churnedRevenue,
    monthly_burn: monthlyBurn,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────
async function fetchAllCharges(
  stripe: Stripe,
  stripeAccountId: string,
  from: number,
  to: number
): Promise<Stripe.Charge[]> {
  const all: Stripe.Charge[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const batch = await stripe.charges.list(
      { created: { gte: from, lte: to }, limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}) },
      { stripeAccount: stripeAccountId }
    );
    all.push(...batch.data);
    hasMore = batch.has_more;
    startingAfter = batch.data[batch.data.length - 1]?.id;
  }
  return all;
}

function sumCharges(charges: Stripe.Charge[]): number {
  return charges
    .filter(c => c.status === "succeeded" && !c.refunded)
    .reduce((s, c) => s + c.amount, 0) / 100;
}
