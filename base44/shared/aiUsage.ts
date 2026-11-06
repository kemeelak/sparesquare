// Shared plan + credit metering. Used by every metered AI function so the numbers
// can never drift between them. Credits are an internal unit: each AI feature costs
// roughly what it consumes, so heavy calls (source extraction) drain the allowance
// faster than a short coach reply.

export const PLANS: Record<string, { name: string; credits: number; price?: string; currency?: string; productId?: string }> = {
  free: { name: "Free", credits: 120 },
  plus: {
    name: "Plus",
    credits: 1500,
    price: "9.00",
    currency: "USD",
    productId: "plus_monthly",
  },
  // Testing accounts: effectively no cap. Never sold, never self-assignable.
  unlimited: { name: "Unlimited", credits: 1000000000 },
};

// What each AI feature costs, in credits.
export const FEATURE_COSTS: Record<string, number> = {
  coach: 3, // a coach reply (long context, every message)
  onboarding_chat: 2, // one onboarding conversation turn
  onboarding_extract: 2, // voice transcript -> structured answers
  onboarding_plan: 4, // first habit suggestions
  library_extract: 8, // pulling habits + principles out of a book/video
  next_read: 6, // web-search suggestion for the shelf
  nudge_motivation: 2, // partner pep talk
  schedule_parse: 4, // free-text schedule -> blocks
  quick_capture: 2, // a typed thing to get done -> a backlog item
  commute_plan: 4, // web-search commute suggestions
};

export const PAID_PRODUCT_IDS = ["plus_monthly"];

// Accounts that never hit a credit cap. The email is read from the signed-in user on the
// server, so a client can't claim it.
export const UNLIMITED_EMAILS = ["kemeelke@gmail.com"];

export function isUnlimitedEmail(email?: string | null): boolean {
  return !!email && UNLIMITED_EMAILS.includes(email.trim().toLowerCase());
}

export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

export function costFor(feature: string): number {
  return FEATURE_COSTS[feature] ?? 0;
}

export function planCredits(plan: string): number {
  return (PLANS[plan] ?? PLANS.free).credits;
}

function rows(res: any): any[] {
  return Array.isArray(res) ? res : res?.items ?? [];
}

// Paid access comes only from a verified Base44Purchase row written by the payments
// webhook — never from anything the user can edit on their own profile.
export async function resolvePlan(db: any, userId: string, email?: string | null): Promise<string> {
  if (isUnlimitedEmail(email)) return "unlimited";
  const purchases = rows(await db.entities.Base44Purchase.filter({ appUserId: userId, status: "paid" }));
  return purchases.some((p: any) => PAID_PRODUCT_IDS.includes(p.productId)) ? "plus" : "free";
}

export async function getUsageRow(db: any, userId: string, period: string) {
  const existing = rows(await db.entities.AiUsage.filter({ user_id: userId, period }));
  return existing[0] ?? null;
}

export async function usageSnapshot(db: any, userId: string, email?: string | null) {
  const plan = await resolvePlan(db, userId, email);
  const limit = planCredits(plan);
  const period = currentPeriod();
  const row = await getUsageRow(db, userId, period);
  const used = row?.credits_used || 0;
  return { plan, limit, used, remaining: Math.max(0, limit - used), period, row };
}