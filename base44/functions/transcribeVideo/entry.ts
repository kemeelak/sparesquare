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

    // Claim this call's slot with a guarded increment: the under-the-cap test is part of
    // the query, so the database decides — concurrent calls can't all spend the same
    // remaining slot, and nothing here depends on a read being fresh.
    const db = base44.asServiceRole;
    const period = hourKey();
    const claim = await db.entities.AiUsage.updateMany(
      { user_id: user.id, period, credits_used: { $lt: MAX_CALLS } },
      { $inc: { credits_used: 1 } }
    );

    if (!claim?.updated) {
      const existing = await db.entities.AiUsage.filter({ user_id: user.id, period }, { limit: 1 });
      if (existing?.items?.length) {
        return Response.json({ error: "Too many transcript requests. Try again later." }, { status: 429 });
      }
      // First paid call of the hour for this member.
      await db.entities.AiUsage.create({ user_id: user.id, period, credits_used: 1 });
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