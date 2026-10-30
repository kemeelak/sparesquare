import { base44 } from "@/api/base44Client";

// Fired app-wide when a user has spent their monthly AI allowance, so the shell can
// offer the upgrade without every page repeating that logic.
export const LIMIT_EVENT = "spare:limit-reached";

// Display copy only — the backend (base44/shared/aiUsage.ts) is the source of truth
// for limits and costs. Keep the credit numbers in sync with it.
export const PLAN_INFO = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    credits: 120,
    blurb: "Enough to set up, meet your Partner, and find your rhythm.",
  },
  plus: {
    id: "plus",
    name: "Plus",
    price: 9,
    credits: 1500,
    productId: "plus_monthly",
    blurb: "For using it properly — daily coaching plus feeding your library.",
  },
};

// What credits actually buy, so the limit feels concrete rather than arbitrary.
export const FEATURE_COSTS = [
  { label: "A message to your Partner", cost: 3 },
  { label: "One thing suggested for your shelf", cost: 6 },
  { label: "Pulling habits out of a book or video", cost: 8 },
  { label: "Planning what to do on a commute", cost: 4 },
];

export async function invokeAI(feature, params) {
  try {
    const res = await base44.functions.invoke("aiRun", { feature, ...params });
    return res.data?.data ?? null;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    if (status === 402 || data?.error === "limit_reached") {
      window.dispatchEvent(new CustomEvent(LIMIT_EVENT, { detail: data }));
      return null;
    }
    throw err;
  }
}

export async function fetchUsage() {
  const res = await base44.functions.invoke("aiUsage", {});
  return res.data;
}

export async function startCheckout(productId) {
  const res = await base44.functions.invoke("create-checkout", { productId });
  return res.data?.redirectUrl;
}