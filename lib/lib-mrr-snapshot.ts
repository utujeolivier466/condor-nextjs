import Stripe from "stripe";

// ─── lib/mrr-snapshot.ts ──────────────────────────────────────────
// Builds MRR snapshots from Stripe subscriptions.
// Used by the NRR engine to compare start vs end of period.
//
// MRR = monthly recurring revenue normalized from any billing interval.
// $1200/year → $100 MRR
// $100/month → $100 MRR
// $300/quarter → $100 MRR

export type CustomerMRR = {
  customer_id: string;
  mrr:         number;        // normalized monthly value in dollars
  plan:        string;
  status:      string;
};

export type MRRSnapshot = {
  taken_at:  Date;
  customers: CustomerMRR[];
  total_mrr: number;
};

// ─── Build a snapshot at a point in time ─────────────────────────
// Pulls all active subscriptions and normalizes to MRR.
export async function buildMRRSnapshot(
  stripe:           Stripe,
  stripeAccountId:  string,
  asOf:             Date
): Promise<MRRSnapshot> {
  const asOfTimestamp = Math.floor(asOf.getTime() / 1000);

  // Pull all subscriptions created before asOf
  const subscriptions = await fetchAllSubscriptions(stripe, stripeAccountId, asOfTimestamp);

  const customers: CustomerMRR[] = [];

  for (const sub of subscriptions) {
    // Only count subscriptions active at asOf
    const isActive =
      sub.status === "active" ||
      sub.status === "trialing" ||
      (sub.status === "canceled" && sub.canceled_at! > asOfTimestamp);

    if (!isActive) continue;

    // Normalize each subscription item to MRR
    let subMRR = 0;
    for (const item of sub.items.data) {
      const price    = item.price;
      const amount   = (price.unit_amount ?? 0) / 100;   // cents → dollars
      const interval = price.recurring?.interval ?? "month";
      const count    = price.recurring?.interval_count ?? 1;

      // Normalize to monthly
      const monthly =
        interval === "year"    ? amount / (12 * count) :
        interval === "month"   ? amount / count         :
        interval === "week"    ? (amount * 52) / 12     :
        interval === "day"     ? (amount * 365) / 12    :
        amount;

      subMRR += monthly * (item.quantity ?? 1);
    }

    customers.push({
      customer_id: sub.customer as string,
      mrr:         Math.round(subMRR * 100) / 100,
      plan:        sub.items.data[0]?.price?.nickname ?? sub.items.data[0]?.price?.id ?? "unknown",
      status:      sub.status,
    });
  }

  const total_mrr = customers.reduce((s, c) => s + c.mrr, 0);

  return { taken_at: asOf, customers, total_mrr };
}

// ─── Compare two snapshots to get expansion/contraction/churn ────
export type MRRMovement = {
  starting_mrr: number;
  expansion:    number;   // existing customers who grew
  contraction:  number;   // existing customers who shrank
  churn:        number;   // customers who left
  new_mrr:      number;   // new customers (excluded from NRR)
  ending_mrr:   number;
};

export function compareMRRSnapshots(
  start: MRRSnapshot,
  end:   MRRSnapshot
): MRRMovement {
  const startMap = new Map(start.customers.map(c => [c.customer_id, c.mrr]));
  const endMap   = new Map(end.customers.map(c => [c.customer_id, c.mrr]));

  let expansion   = 0;
  let contraction = 0;
  let churn       = 0;
  let new_mrr     = 0;

  // Check every customer in end snapshot
  for (const [customerId, endMRR] of endMap) {
    const startMRR = startMap.get(customerId);

    if (startMRR === undefined) {
      // Not in start snapshot = new customer
      new_mrr += endMRR;
    } else if (endMRR > startMRR) {
      // Expanded
      expansion += endMRR - startMRR;
    } else if (endMRR < startMRR) {
      // Contracted
      contraction += startMRR - endMRR;
    }
    // else: unchanged — no contribution
  }

  // Check every customer in start snapshot who's gone
  for (const [customerId, startMRR] of startMap) {
    if (!endMap.has(customerId)) {
      churn += startMRR;
    }
  }

  return {
    starting_mrr: start.total_mrr,
    expansion:    Math.round(expansion   * 100) / 100,
    contraction:  Math.round(contraction * 100) / 100,
    churn:        Math.round(churn       * 100) / 100,
    new_mrr:      Math.round(new_mrr     * 100) / 100,
    ending_mrr:   end.total_mrr,
  };
}

// ─── Fetch all subscriptions (auto-paginated) ─────────────────────
async function fetchAllSubscriptions(
  stripe:          Stripe,
  stripeAccountId: string,
  createdBefore:   number
): Promise<Stripe.Subscription[]> {
  const all: Stripe.Subscription[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const batch = await stripe.subscriptions.list(
      {
        limit:   100,
        status:  "all",
        created: { lte: createdBefore },
        expand:  ["data.items.data.price"],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
      { stripeAccount: stripeAccountId }
    );
    all.push(...batch.data);
    hasMore        = batch.has_more;
    startingAfter  = batch.data[batch.data.length - 1]?.id;
  }
  return all;
}
