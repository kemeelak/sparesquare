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
  // Use youtube-transcript-api compatible approach via a timedtext URL
  // This fetches auto-generated captions directly without scraping HTML
  const apiUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&fmt=json3&xorb=2&xobt=3&xovt=3&asr_langs=en`;
  
  let res = await fetch(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    }
  });

  if (res.ok) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("json")) {
      const data = await res.json();
      if (data.events && data.events.length > 0) {
        const text = data.events
          .filter(e => e.segs)
          .flatMap(e => e.segs.map(s => s.utf8 || ""))
          .join(" ")
          .replace(/\s+/g, " ").trim();
        if (text.length > 50) return text;
      }
    }
  }

  // Fallback: use XML timedtext
  const xmlUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`;
  res = await fetch(xmlUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    }
  });
  if (res.ok) {
    const xml = await res.text();
    if (xml.length > 100) {
      const text = xml
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
        .replace(/\s+/g, " ").trim();
      if (text.length > 50) return text;
    }
  }

  // Fallback: try auto-generated captions with a2_lang param
  const asrUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&kind=asr`;
  res = await fetch(asrUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    }
  });
  if (res.ok) {
    const xml = await res.text();
    if (xml.length > 100) {
      const text = xml
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
        .replace(/\s+/g, " ").trim();
      if (text.length > 50) return text;
    }
  }

  throw new Error("No captions available. Make sure the video has English subtitles or auto-generated captions enabled.");
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