import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import DumpActionCard from "./DumpActionCard";

// One dump and the answer it pulled back, pinned side by side and tied together.
export default function DumpEntryCard({ entry, reflecting }) {
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

  const stamp = entry.created_date
    ? format(new Date(entry.created_date), "EEE d MMM · h:mm a")
    : "just now";

  return (
    <div className="tw-pair">
      <article className="tw-note">
        <span className="tw-pin" aria-hidden="true" />
        <p className="tw-stamp">{stamp}</p>
        {entry.text && <p className="tw-body">{entry.text}</p>}
        {photo && (
          <img src={photo} alt="What you dropped in" className="tw-photo" />
        )}
      </article>

      <article className="tw-note tw-note-answer">
        <span className="tw-pin tw-pin-alt" aria-hidden="true" />
        {reflecting ? (
          <p className="tw-scribble animate-pulse">Reading it…</p>
        ) : entry.reflection ? (
          <>
            <p className="tw-scribble">{entry.reflection}</p>
            <DumpActionCard entry={entry} />
          </>
        ) : (
          <p className="tw-small" style={{ margin: 0 }}>Nothing came back on this one.</p>
        )}
      </article>

      <span className="tw-join" aria-hidden="true">
        <span className="tw-seal">
          <svg viewBox="0 0 24 24">
            <path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" />
          </svg>
        </span>
      </span>
    </div>
  );
}