import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { url } = await req.json();
    if (!url) return Response.json({ error: "No URL provided" }, { status: 400 });

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