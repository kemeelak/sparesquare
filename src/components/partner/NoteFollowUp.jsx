import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Check, ChevronRight, Loader2, Pencil, Trash2 } from "lucide-react";

// One addition on a dump — words, a photo, a recording, or any mix of the three.
// It can be rewritten or taken back out, or opened on its own to go deeper.
export default function NoteFollowUp({ item, onSave, onDelete, onOpen }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text || "");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [voice, setVoice] = useState(null);

  useEffect(() => {
    let alive = true;
    const link = (uri) =>
      base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 })
        .then((res) => res?.signed_url || null)
        .catch(() => null);

    if (item.photo_url) link(item.photo_url).then((url) => alive && setPhoto(url));
    if (item.voice_uri) link(item.voice_uri).then((url) => alive && setVoice(url));

    return () => { alive = false; };
  }, [item.photo_url, item.voice_uri]);

  const save = async () => {
    const next = draft.trim();
    if (!next && !item.photo_url && !item.voice_uri) return;
    if (next === (item.text || "")) {
      setEditing(false);
      return;
    }
    setBusy(true);
    await onSave({ text: next });
    setBusy(false);
    setEditing(false);
  };

  const deeper = item.notes?.length || 0;
  const canOpen = !!onOpen && !editing && !confirming;

  return (
    <article
      className={`tw-follow${onOpen ? " tw-follow-btn" : ""}`}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={() => { if (canOpen) onOpen(); }}
      onKeyDown={(e) => {
        if (!canOpen) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={onOpen ? "Open this addition" : undefined}
    >
      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setEditing(false); setDraft(item.text || ""); }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
            }}
            aria-label="Edit this addition"
            className="tw-edit tw-edit-follow"
            autoFocus
          />
          <div className="tw-foot">
            <button onClick={save} disabled={busy} className="tw-do">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
            <button
              onClick={() => { setEditing(false); setDraft(item.text || ""); }}
              className="tw-later"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          {item.text ? <p className="tw-body">{item.text}</p> : null}
          {photo && <img src={photo} alt="A photo you added" className="tw-follow-photo" />}
          {voice && (
            <audio
              controls
              preload="none"
              src={voice}
              className="tw-audio"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          )}

          <div className="tw-follow-foot">
            <p className="tw-follow-stamp">
              {item.at ? format(new Date(item.at), "d MMM · h:mm a") : "just now"}
              {deeper > 0 ? ` · ${deeper} deeper` : ""}
            </p>
            <div className="tw-follow-tools" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setEditing(true)} aria-label="Edit this addition">
                <Pencil />
              </button>
              <button
                type="button"
                className="tw-icon-danger"
                onClick={() => setConfirming(true)}
                aria-label="Delete this addition"
              >
                <Trash2 />
              </button>
              {onOpen && (
                <button type="button" onClick={onOpen} aria-label="Go deeper into this addition">
                  <ChevronRight />
                </button>
              )}
            </div>
          </div>

          {confirming && (
            <div className="tw-foot" onClick={(e) => e.stopPropagation()}>
              <span className="tw-small" style={{ margin: 0, flex: 1 }}>Take this one out?</span>
              <button onClick={() => { setConfirming(false); onDelete(); }} className="tw-do tw-do-danger">Delete</button>
              <button onClick={() => setConfirming(false)} className="tw-later">Keep it</button>
            </div>
          )}
        </>
      )}
    </article>
  );
}