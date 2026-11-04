import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Caps paid Supadata calls per signed-in user, per hour. The count lives in the
// database (an AiUsage row keyed by the hour) instead of isolate memory, so it holds
// across concurrent isolates and cold starts.
const YOUTUBE_RE = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\//i;
const MAX_CALLS = 10;

function hourKey() {
  return `transcripts:${new Date().toISOString().slice(0, 13)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { url } = await req.json();
    if (!url) return Response.json({ error: "No URL provided" }, { status: 400 });

    // Server-side URL validation — only YouTube URLs are forwarded to the
    // paid Supadata API. The client-side check is a UI convenience only.
    if (!YOUTUBE_RE.test(url.trim())) {
      return Response.json({ error: "Only YouTube URLs are supported" }, { status: 400 });
    }

    // One row per member per hour is the counter, and only the row created first counts.
    // Two rows for the same hour would each carry their own allowance, so a call that
    // loses the race drops the row it just created and spends its slot on the first row
    // with a guarded increment: the under-the-cap test is inside the query, so the
    // database decides and no read is trusted.
    const db = base44.asServiceRole;
    const period = hourKey();

    const mine = await db.entities.AiUsage.create({ user_id: user.id, period, credits_used: 1 });
    const rows = await db.entities.AiUsage.filter(
      { user_id: user.id, period },
      { sort: "created_date", limit: 20 }
    );
    const counter = rows?.items?.[0];

    let hasSlot = true;
    if (counter && counter.id !== mine.id) {
      await db.entities.AiUsage.delete(mine.id);
      const claim = await db.entities.AiUsage.updateMany(
        { user_id: user.id, period, id: counter.id, credits_used: { $lt: MAX_CALLS } },
        { $inc: { credits_used: 1 } }
      );
      hasSlot = !!claim?.updated;
    }

    if (!hasSlot) {
      return Response.json({ error: "Too many transcript requests. Try again later." }, { status: 429 });
    }

    const apiKey = Deno.env.get("SUPADATA_API_KEY");
    const res = await fetch(`https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(url)}&text=true`, {
      headers: { "x-api-key": apiKey }
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Supadata error: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    const transcript = typeof data.content === "string"
      ? data.content
      : (data.content || []).map(s => s.text).join(" ");

    return Response.json({ transcript });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});