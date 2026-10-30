// Current credit standing for the signed-in user — powers the account and plan pages
// and the limit-reached prompt.

import { createClientFromRequest } from "npm:@base44/sdk";
import { usageSnapshot } from "../../shared/aiUsage.ts";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const snap = await usageSnapshot(base44.asServiceRole, user.id);
    return new Response(
      JSON.stringify({
        plan: snap.plan,
        limit: snap.limit,
        used: snap.used,
        remaining: snap.remaining,
        period: snap.period,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("aiUsage: unhandled error", error);
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), { status: 500 });
  }
}