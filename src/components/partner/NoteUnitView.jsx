import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Check, Pencil, Sparkles, Trash2 } from "lucide-react";
import NoteBlockHead from "./NoteBlockHead";
import NoteExploreView from "./NoteExploreView";
import { shortTitle } from "./DumpNoteFront";

// One note from inside a thread, opened on its own so it can be read properly,
// rewritten, or taken back out.
export default function NoteUnitView({ item, parent, entryId, partnerName, onBack, onChange, onDelete }) {
  const [photo, setPhoto] = useState(null);
  const [voice, setVoice] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text || "");
  const [confirming, setConfirming] = useState(false);
  const [exploring, setExploring] = useState(false);

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

  const title = shortTitle(item.text)
    || (item.voice_uri ? "A recording you added" : item.photo_url ? "A photo you added" : "One line you added");

  const save = async () => {
    const next = draft.trim();
    setEditing(false);
    if (!next && !item.photo_url && !item.voice_uri) return;
    if (next === (item.text || "")) return;
    await onChange({ text: next });
  };

  if (exploring) {
    return (
      <NoteExploreView
        entryId={entryId}
        subject={item.text}
        context={parent?.text || ""}
        partnerName={partnerName}
        backLabel="The note"
        onBack={() => setExploring(false)}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="tw-head">
        <button type="button" className="tw-back" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5" />
          The addition
        </button>
        <span className="tw-head-stamp">
          {item.at ? format(new Date(item.at), "d MMM · h:mm a") : "just now"}
        </span>
        <div className="tw-head-tools">
          <button
            type="button"
            className="tw-icon-btn"
            onClick={() => { setEditing(true); setConfirming(false); }}
            aria-label="Edit this note"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="tw-icon-btn tw-icon-danger"
            onClick={() => setConfirming(true)}
            aria-label="Delete this note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="tw-scroll tw-detail-scroll">
        <div className="tw-detail-inner">
          <h1 className="tw-detail-title">{title}</h1>

          <article className="tw-note tw-detail-note">
            <span className="tw-pin tw-pin-alt" aria-hidden="true" />
            <NoteBlockHead
              label="One you added"
              editing={editing}
              onEdit={() => { setEditing(true); setConfirming(false); }}
            />

            {editing ? (
              <>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { setEditing(false); setDraft(item.text || ""); }
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
                  }}
                  aria-label="Edit this note"
                  className="tw-edit"
                  autoFocus
                />
                <div className="tw-foot">
                  <button onClick={save} className="tw-do">
                    <Check className="w-3.5 h-3.5" />
                    Save
                  </button>
                  <button onClick={() => { setEditing(false); setDraft(item.text || ""); }} className="tw-later">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                {item.text ? <p className="tw-body">{item.text}</p> : null}
                {photo && <img src={photo} alt="A photo you added" className="tw-photo" />}
                {voice && <audio controls preload="none" src={voice} className="tw-audio tw-audio-lead" />}
              </>
            )}

            {!editing && (
              <button type="button" className="tw-explore-cta" onClick={() => setExploring(true)}>
                <Sparkles className="w-4 h-4" />
                Dig deeper with {partnerName || "your partner"}
              </button>
            )}

            {confirming && (
              <div className="tw-foot">
                <span className="tw-small" style={{ margin: 0, flex: 1 }}>Take this one out?</span>
                <button onClick={onDelete} className="tw-do tw-do-danger">Delete</button>
                <button onClick={() => setConfirming(false)} className="tw-later">Keep it</button>
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}