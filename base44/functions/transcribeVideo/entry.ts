import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Per-user in-memory throttle (sliding 1-hour window). Caps paid Supadata calls
// per signed-in user; resets on isolate cold start but blocks tight loops.
const YOUTUBE_RE = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\//i;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_CALLS = 10;
const recentCalls = new Map<string, number[]>();

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

    // Per-user throttle: keep only calls within the last hour.
    const now = Date.now();
    const times = (recentCalls.get(user.id) || []).filter((t) => now - t < WINDOW_MS);
    if (times.length >= MAX_CALLS) {
      return Response.json({ error: "Too many transcript requests. Try again later." }, { status: 429 });
    }
    times.push(now);
    recentCalls.set(user.id, times);

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