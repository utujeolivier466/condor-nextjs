import Stripe from "stripe";

// ─── lib/core-action-detector.ts ─────────────────────────────────
// Automatically detects the core action from Stripe events.
// No manual configuration. Runs once per company per week.
//
// Pipeline:
//   1. Pull last 90 days of Stripe events
//   2. Filter to revenue events only
//   3. Score each candidate by frequency + revenue + recurrence
//   4. Declare winner if confidence threshold met
//   5. Calculate conversion rate for winning action

export type CoreActionResult = {
  action:           string;        // e.g. "invoice.paid"
  conversion_rate:  number | null; // 0–100
  confidence:       "confirmed" | "early_signal" | "insufficient";
  business_model:   "subscription" | "transactional";
  total_events:     number;
  detail:           string;        // human-readable explanation
};

// Revenue events only — ignore everything else
const REVENUE_EVENTS = [
  "invoice.paid",
  "payment_intent.succeeded",
  "charge.succeeded",
  "customer.subscription.created",
] as const;

// Scoring weights
const WEIGHTS = {
  "invoice.paid":                     { revenue: 1.0, recurrence: 1.2 },
  "payment_intent.succeeded":         { revenue: 1.0, recurrence: 1.0 },
  "charge.succeeded":                 { revenue: 1.0, recurrence: 1.0 },
  "customer.subscription.created":    { revenue: 1.5, recurrence: 1.5 },
} as const;

const CONFIDENCE_THRESHOLD = 20; // min events to confirm

// ─── Main: detect core action for a company ───────────────────────
export async function detectCoreAction(
  stripe:          Stripe,
  stripeAccountId: string
): Promise<CoreActionResult> {

  // 1. Pull 90 days of events
  const events = await fetchRevenueEvents(stripe, stripeAccountId);

  if (events.length === 0) {
    return {
      action:          "insufficient_data",
      conversion_rate: null,
      confidence:      "insufficient",
      business_model:  "transactional",
      total_events:    0,
      detail:          "No revenue events found in the last 90 days.",
    };
  }

  // 2. Group by event type
  const grouped = new Map<string, { count: number; revenue: number }>();

  for (const event of events) {
    const type    = event.type;
    const revenue = extractRevenue(event);
    const current = grouped.get(type) ?? { count: 0, revenue: 0 };
    grouped.set(type, { count: current.count + 1, revenue: current.revenue + revenue });
  }

  // 3. Detect business model
  const subEvents    = grouped.get("customer.subscription.created")?.count ?? 0;
  const business_model: "subscription" | "transactional" =
    subEvents > 0 ? "subscription" : "transactional";

  // 4. Score each candidate
  let winner      = "";
  let topScore    = -Infinity;
  let totalEvents = 0;

  for (const [eventType, data] of grouped) {
    if (!REVENUE_EVENTS.includes(eventType as unknown as typeof REVENUE_EVENTS[0])) continue;
    totalEvents += data.count;

    const w     = WEIGHTS[eventType as keyof typeof WEIGHTS];
    const score = data.count * w.revenue * w.recurrence;

    if (score > topScore) {
      topScore = score;
      winner   = eventType;
    }
  }

  // 5. Confidence check
  const confidence: CoreActionResult["confidence"] =
    totalEvents >= CONFIDENCE_THRESHOLD ? "confirmed" :
    totalEvents >= 5                    ? "early_signal" :
    "insufficient";

  if (confidence === "insufficient") {
    return {
      action:          winner || "insufficient_data",
      conversion_rate: null,
      confidence,
      business_model,
      total_events:    totalEvents,
      detail:          `Only ${totalEvents} revenue events found. Need ${CONFIDENCE_THRESHOLD} to confirm.`,
    };
  }

  // 6. Calculate conversion rate for winning action
  const conversion_rate = await calculateConversionRate(
    stripe, stripeAccountId, winner, grouped
  );

  // 7. Build human-readable detail
  const detail = buildDetail(winner, business_model, grouped);

  return {
    action: winner,
    conversion_rate,
    confidence,
    business_model,
    total_events: totalEvents,
    detail,
  };
}

// ─── Calculate conversion rate for the winning action ────────────
async function calculateConversionRate(
  stripe:          Stripe,
  stripeAccountId: string,
  winner:          string,
  grouped:         Map<string, { count: number; revenue: number }>
): Promise<number | null> {

  // invoice.paid: paid / created
  if (winner === "invoice.paid") {
    const paid    = grouped.get("invoice.paid")?.count    ?? 0;
    const created = await countInvoicesCreated(stripe, stripeAccountId);
    if (created === 0) return null;
    return Math.round((paid / created) * 100 * 10) / 10;
  }

  // subscription.created: created / customers
  if (winner === "customer.subscription.created") {
    const created   = grouped.get("customer.subscription.created")?.count ?? 0;
    const customers = await countCustomers(stripe, stripeAccountId);
    if (customers === 0) return null;
    return Math.round((created / customers) * 100 * 10) / 10;
  }

  // payment_intent.succeeded / charge.succeeded: succeeded / attempted
  if (winner === "payment_intent.succeeded" || winner === "charge.succeeded") {
    const succeeded = grouped.get(winner)?.count ?? 0;
    const attempted = await countPaymentAttempts(stripe, stripeAccountId);
    if (attempted === 0) return null;
    return Math.round((succeeded / attempted) * 100 * 10) / 10;
  }

  return null;
}

// ─── Pull revenue events (last 90 days) ──────────────────────────
async function fetchRevenueEvents(
  stripe:          Stripe,
  stripeAccountId: string
): Promise<Stripe.Event[]> {
  const all: Stripe.Event[] = [];
  const since = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const batch = await stripe.events.list(
      {
        limit:   100,
        created: { gte: since },
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
      { stripeAccount: stripeAccountId }
    );

    // Filter to revenue events only
    const relevant = batch.data.filter(e =>
      REVENUE_EVENTS.includes(e.type as unknown as typeof REVENUE_EVENTS[0])
    );
    all.push(...relevant);

    hasMore       = batch.has_more;
    startingAfter = batch.data[batch.data.length - 1]?.id;
  }

  return all;
}

// ─── Extract revenue amount from event ───────────────────────────
function extractRevenue(event: Stripe.Event): number {
  try {
    const obj = (event.data.object as unknown) as Record<string, unknown>;
    const amount = (obj.amount_paid ?? obj.amount ?? obj.amount_received ?? 0) as number;
    return amount / 100;
  } catch {
    return 0;
  }
}

// ─── Count helpers ────────────────────────────────────────────────
async function countInvoicesCreated(stripe: Stripe, accountId: string): Promise<number> {
  const since = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
  const result = await stripe.invoices.list(
    { limit: 1, created: { gte: since } },
    { stripeAccount: accountId }
  );
  // Stripe doesn't give total_count directly — use a reasonable estimate
  // Full count would require pagination; for V1 this is directionally correct
  return result.data.length > 0 ? await paginateCount(
    (params) => stripe.invoices.list(params, { stripeAccount: accountId }),
    { created: { gte: since } }
  ) : 0;
}

async function countCustomers(stripe: Stripe, accountId: string): Promise<number> {
  return paginateCount(
    (params) => stripe.customers.list(params, { stripeAccount: accountId }),
    {}
  );
}

async function countPaymentAttempts(stripe: Stripe, accountId: string): Promise<number> {
  const since = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
  return paginateCount(
    (params) => stripe.paymentIntents.list(params, { stripeAccount: accountId }),
    { created: { gte: since } }
  );
}

async function paginateCount(
  listFn: (params: Record<string, unknown>) => Promise<Stripe.ApiList<any>>,
  baseParams: Record<string, unknown>
): Promise<number> {
  let count = 0;
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const params = {
      limit: 100,
      ...baseParams,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    };
    const batch = await listFn(params);
    count += batch.data.length;
    hasMore = batch.has_more;
    startingAfter = (batch.data[batch.data.length - 1] as any)?.id;
  }

  return count;
}

// ─── Human-readable explanation ──────────────────────────────────
function buildDetail(
  winner:        string,
  businessModel: string,
  grouped:       Map<string, { count: number; revenue: number }>
): string {
  const data = grouped.get(winner);
  if (!data) return "";

  const labels: Record<string, string> = {
    "invoice.paid":                  "invoices paid",
    "payment_intent.succeeded":      "payments succeeded",
    "charge.succeeded":              "charges succeeded",
    "customer.subscription.created": "subscriptions created",
  };

  return `${businessModel} business — ${data.count} ${labels[winner] ?? winner} in 90 days generating $${Math.round(data.revenue).toLocaleString()}`;
}
