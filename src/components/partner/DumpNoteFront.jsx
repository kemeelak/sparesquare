import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { ArrowUpRight, Bookmark, Check, MessageSquare, Sparkles } from "lucide-react";

export function shortTitle(text) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  return words.slice(0, 6).join(" ") + (words.length > 6 ? "…" : "");
}

// The front of one dump: just enough to recognise it. Tapping it goes deeper.
export default function DumpNoteFront({ entry, reflecting, keptCount = 0, onOpen }) {
  const [photo, setPhoto] = useState(null);

  // Photos sit in private storage, so each one is opened with a short-lived link.
  useEffect(() => {
    let alive = true;
    if (!entry.photo_url) return undefined;
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: entry.photo_url, expires_in: 3600 })
      .then((res) => { if (alive) setPhoto(res?.signed_url || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [entry.photo_url]);

  const stamp = entry.created_date ? format(new Date(entry.created_date), "d MMM · h:mm a") : "just now";
  const title = entry.title || shortTitle(entry.text) || (entry.photo_url ? "A photo you dropped" : "Untitled");
  const snippet = entry.title ? entry.text : "";
  const followUps = entry.follow_ups?.length || 0;
  const kept = entry.action_status === "kept";

  return (
    <motion.div layout exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.22 }}>
      <button type="button" className="tw-front" onClick={onOpen} aria-label={`Open: ${title}`}>
        <span className="tw-pin" aria-hidden="true" />
        <p className="tw-stamp">{stamp}</p>
        <h3 className="tw-front-title">{reflecting ? "Reading it…" : title}</h3>
        {snippet && <p className="tw-front-snippet">{snippet}</p>}
        {photo && <img src={photo} alt="" className="tw-front-photo" />}

        {!reflecting && (
          <div className="tw-front-meta">
            {keptCount > 0 && (
              <span className="tw-front-bit tw-front-bit-kept">
                <Bookmark className="w-3 h-3" fill="currentColor" />
                {keptCount} kept
              </span>
            )}
            {kept && (
              <span className="tw-front-bit tw-front-bit-done">
                <Check className="w-3 h-3" />
                Habit saved
              </span>
            )}
            {!kept && entry.action_title && (
              <span className="tw-front-bit">
                <Sparkles className="w-3 h-3" />1 move inside
              </span>
            )}
            {followUps > 0 && (
              <span className="tw-front-bit">
                <MessageSquare className="w-3 h-3" />
                {followUps} added
              </span>
            )}
          </div>
        )}

        <span className="tw-front-go" aria-hidden="true">
          <ArrowUpRight className="w-3.5 h-3.5" />
        </span>
      </button>
    </motion.div>
  );
}