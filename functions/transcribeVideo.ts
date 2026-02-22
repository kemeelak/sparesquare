import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Extract YouTube video ID from various URL formats
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function fetchTranscript(videoId) {
  // Use a public transcript API
  const res = await fetch(
    `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&lang=en`,
    { headers: { "Accept": "application/json" } }
  );
  if (res.ok) {
    const data = await res.json();
    // supadata returns { content: [{text, start, dur}] } or { transcript: "..." }
    if (data.content && Array.isArray(data.content)) {
      return data.content.map(c => c.text).join(" ");
    }
    if (data.transcript) return data.transcript;
  }

  // Fallback: try youtube-transcript via a scraping endpoint
  const res2 = await fetch(
    `https://youtubetranscript.com/?server_vid2=${videoId}`
  );
  if (res2.ok) {
    const text = await res2.text();
    // strip XML/HTML tags
    const stripped = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (stripped.length > 100) return stripped;
  }

  throw new Error("Could not retrieve transcript for this video. The video may not have captions available.");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { url } = await req.json();
    if (!url) return Response.json({ error: "No URL provided" }, { status: 400 });

    const videoId = extractVideoId(url);
    if (!videoId) return Response.json({ error: "Invalid YouTube URL" }, { status: 400 });

    const transcript = await fetchTranscript(videoId);

    return Response.json({ transcript, videoId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});