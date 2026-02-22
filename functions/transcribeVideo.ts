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

// Fetch the YouTube page and extract the caption track URL
async function getCaptionTrackUrl(videoId) {
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    }
  });
  const html = await pageRes.text();

  // Extract captionTracks from ytInitialPlayerResponse
  const match = html.match(/"captionTracks":(\[.*?\])/);
  if (!match) return null;

  const tracks = JSON.parse(match[1]);
  // Prefer English auto-generated or manual
  const englishTrack = tracks.find(t => t.languageCode === "en" && t.kind === "asr")
    || tracks.find(t => t.languageCode === "en")
    || tracks[0];

  return englishTrack?.baseUrl || null;
}

// Fetch and parse the caption XML into plain text
async function fetchCaptions(captionUrl) {
  const res = await fetch(captionUrl + "&fmt=json3");
  if (res.ok) {
    const data = await res.json();
    if (data.events) {
      return data.events
        .filter(e => e.segs)
        .map(e => e.segs.map(s => s.utf8).join(""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  // Fallback: fetch XML format
  const xmlRes = await fetch(captionUrl);
  if (xmlRes.ok) {
    const xml = await xmlRes.text();
    const text = xml
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
    return text;
  }

  return null;
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

    const captionUrl = await getCaptionTrackUrl(videoId);
    if (!captionUrl) {
      return Response.json({ error: "No captions available for this video. Try a video with subtitles enabled." }, { status: 404 });
    }

    const transcript = await fetchCaptions(captionUrl);
    if (!transcript) {
      return Response.json({ error: "Could not parse captions for this video." }, { status: 500 });
    }

    return Response.json({ transcript, videoId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});