// Metered AI gateway. Every AI call in the app goes through here so usage is counted
// and capped per user, per plan, per month. Returns 402 when the allowance is spent.

import { createClientFromRequest } from "npm:@base44/sdk";
import { costFor, planCredits, getUsageRow, resolvePlan, currentPeriod } from "../../shared/aiUsage.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default async function (req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const feature = typeof body.feature === "string" ? body.feature : "";
    const cost = costFor(feature);
    if (!cost) return json({ error: "Unknown feature" }, 400);
    if (typeof body.prompt !== "string" || !body.prompt.trim()) {
      return json({ error: "prompt is required" }, 400);
    }

    const db = base44.asServiceRole;
    const plan = await resolvePlan(db, user.id);
    const limit = planCredits(plan);
    const period = currentPeriod();
    const row = await getUsageRow(db, user.id, period);
    const used = row?.credits_used || 0;

    if (used + cost > limit) {
      console.log("aiRun: limit reached", { userId: user.id, feature, used, limit, plan });
      return json({ error: "limit_reached", plan, used, limit, cost, feature }, 402);
    }

    const data = await db.integrations.Core.InvokeLLM({
      prompt: body.prompt,
      ...(body.response_json_schema ? { response_json_schema: body.response_json_schema } : {}),
      ...(body.add_context_from_internet === true ? { add_context_from_internet: true } : {}),
      ...(body.model ? { model: body.model } : {}),
    });

    const newUsed = used + cost;
    if (row) await db.entities.AiUsage.update(row.id, { credits_used: newUsed });
    else await db.entities.AiUsage.create({ user_id: user.id, period, credits_used: newUsed });

    return json({ data, usage: { plan, used: newUsed, limit, remaining: Math.max(0, limit - newUsed), period } });
  } catch (error: any) {
    console.error("aiRun: unhandled error", error);
    return json({ error: error?.message || "Internal error" }, 500);
  }
}