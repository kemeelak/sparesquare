import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Check, Loader2 } from "lucide-react";
import DumpActionCard from "./DumpActionCard";

// One dump and the answer it pulled back, pinned side by side and tied together.
export default function DumpEntryCard({ entry, reflecting }) {
  const [photo, setPhoto] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.text || "");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

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

  const stopEditing = () => {
    setEditing(false);
    setDraft(entry.text || "");
  };

  const saveEdit = async () => {
    const next = draft.trim();
    if (!next || next === entry.text) return stopEditing();
    setSaving(true);
    await base44.entities.DumpEntry.update(entry.id, { text: next });
    queryClient.invalidateQueries({ queryKey: ["dumpEntries"] });
    setSaving(false);
    setEditing(false);
  };

  const remove = async () => {
    setConfirming(false);
    await base44.entities.DumpEntry.delete(entry.id);
    queryClient.invalidateQueries({ queryKey: ["dumpEntries"] });
  };

  return (
    <motion.div
      className="tw-pair"
      layout
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.24 }}
    >
      <article className="tw-note tw-note-live">
        <span className="tw-pin" aria-hidden="true" />
        <p className="tw-stamp">{stamp}</p>

        {editing ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") stopEditing();
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit();
              }}
              aria-label="Edit this note"
              className="tw-edit"
              autoFocus
            />
            <div className="tw-foot">
              <button onClick={saveEdit} disabled={saving} className="tw-do">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
              <button onClick={stopEditing} className="tw-later">Cancel</button>
            </div>
          </>
        ) : (
          <>
            {entry.text && <p className="tw-body">{entry.text}</p>}
            {photo && <img src={photo} alt="What you dropped in" className="tw-photo" />}

            {!reflecting && (confirming ? (
              <div className="tw-foot">
                <span className="tw-small" style={{ margin: 0, flex: 1 }}>Delete this note?</span>
                <button onClick={remove} className="tw-do tw-do-danger">Delete</button>
                <button onClick={() => setConfirming(false)} className="tw-later">Keep it</button>
              </div>
            ) : (
              <div className="tw-card-tools">
                <button onClick={() => setEditing(true)} className="tw-icon-btn" aria-label="Edit this note">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setConfirming(true)} className="tw-icon-btn tw-icon-danger" aria-label="Delete this note">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </>
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
    </motion.div>
  );
}