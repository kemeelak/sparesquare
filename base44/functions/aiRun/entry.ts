// Metered AI gateway. Every AI call in the app goes through here so usage is counted
// and capped per user, per plan, per month. Returns 402 when the allowance is spent.

import { createClientFromRequest } from "npm:@base44/sdk";
import { costFor, planCredits, resolvePlan, currentPeriod } from "../../shared/aiUsage.ts";

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

    const usageRows = async () => {
      const res: any = await db.entities.AiUsage.filter({ user_id: user.id, period });
      return Array.isArray(res) ? res : res?.items ?? [];
    };
    const totalOf = (list: any[]) => list.reduce((sum, r) => sum + (r.credits_used || 0), 0);

    const before = await usageRows();
    const usedBefore = totalOf(before);
    if (usedBefore + cost > limit) {
      console.log("aiRun: limit reached", { userId: user.id, feature, used: usedBefore, limit, plan });
      return json({ error: "limit_reached", plan, used: usedBefore, limit, cost, feature }, 402);
    }

    // Reserve the credits up front with an atomic $inc, then read the real total back.
    // Two requests in flight can no longer both spend against the same stale count: the
    // database serialises the increments, so the loser sees a total over the cap and is
    // refused (its reservation handed straight back).
    let createdRowId: string | null = null;
    if (before.length === 0) {
      const created: any = await db.entities.AiUsage.create({ user_id: user.id, period, credits_used: cost });
      createdRowId = created?.id ?? null;
    } else {
      await db.entities.AiUsage.updateMany({ user_id: user.id, period }, { $inc: { credits_used: cost } });
    }

    const reserved = totalOf(await usageRows());

    const refund = async () => {
      if (createdRowId) {
        await db.entities.AiUsage.delete(createdRowId).catch((e: any) => console.error("aiRun: refund failed", e));
        return;
      }
      await db.entities.AiUsage.updateMany(
        { user_id: user.id, period, credits_used: { $gte: cost } },
        { $inc: { credits_used: -cost } }
      );
    };

    if (reserved > limit) {
      await refund();
      console.log("aiRun: limit reached by a concurrent call", { userId: user.id, feature, reserved, limit, plan });
      return json({ error: "limit_reached", plan, used: Math.max(0, reserved - cost), limit, cost, feature }, 402);
    }

    let data;
    try {
      data = await db.integrations.Core.InvokeLLM({
        prompt: body.prompt,
        ...(body.response_json_schema ? { response_json_schema: body.response_json_schema } : {}),
        ...(body.add_context_from_internet === true ? { add_context_from_internet: true } : {}),
        ...(body.model ? { model: body.model } : {}),
      });
    } catch (error) {
      await refund();
      throw error;
    }

    return json({ data, usage: { plan, used: reserved, limit, remaining: Math.max(0, limit - reserved), period } });
  } catch (error: any) {
    console.error("aiRun: unhandled error", error);
    return json({ error: error?.message || "Internal error" }, 500);
  }
}