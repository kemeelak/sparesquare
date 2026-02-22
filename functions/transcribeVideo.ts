import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

async function getTranscript(videoId) {
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
  });

  if (!pageRes.ok) throw new Error("Failed to fetch YouTube page");
  const html = await pageRes.text();

  // Extract the serialized player response JSON
  const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/);
  if (!playerResponseMatch) {
    throw new Error("Could not find player response on page");
  }

  let playerResponse;
  try {
    playerResponse = JSON.parse(playerResponseMatch[1]);
  } catch {
    throw new Error("Failed to parse player response JSON");
  }

  const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No captions available for this video");
  }

  // Prefer English track
  const track = captionTracks.find(t => t.languageCode === "en" && t.kind === "asr")
    || captionTracks.find(t => t.languageCode === "en")
    || captionTracks[0];

  const captionUrl = track.baseUrl;

  // Fetch captions as XML
  const captRes = await fetch(captionUrl + "&fmt=json3");
  if (captRes.ok) {
    try {
      const data = await captRes.json();
      if (data.events) {
        const text = data.events
          .filter(e => e.segs)
          .flatMap(e => e.segs.map(s => s.utf8 || ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (text.length > 50) return text;
      }
    } catch { /* fall through to XML */ }
  }

  // XML fallback
  const xmlRes = await fetch(captionUrl);
  if (xmlRes.ok) {
    const xml = await xmlRes.text();
    const text = xml
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/\s+/g, " ").trim();
    if (text.length > 50) return text;
  }

  throw new Error("Could not parse caption content");
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

    const transcript = await getTranscript(videoId);
    return Response.json({ transcript, videoId });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});