import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Check, Pencil, Trash2 } from "lucide-react";
import NoteBlockHead from "./NoteBlockHead";
import NoteFollowUp from "./NoteFollowUp";
import NoteFollowUpBar from "./NoteFollowUpBar";
import NoteUnitView from "./NoteUnitView";
import { shortTitle } from "./DumpNoteFront";

// One addition, opened on its own — so anything they pile onto it has a place to land.
export default function NoteAdditionView({ item, partnerName, onBack, onChange, onDelete }) {
  const [photo, setPhoto] = useState(null);
  const [voice, setVoice] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text || "");
  const [confirming, setConfirming] = useState(false);
  const scrollRef = useRef(null);
  const [openNote, setOpenNote] = useState(null);
  const notes = item.notes || [];

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
    || (item.voice_uri ? "A recording you added" : item.photo_url ? "A photo you added" : "One you added");

  const saveText = async () => {
    const next = draft.trim();
    setEditing(false);
    if (!next && !item.photo_url && !item.voice_uri) return;
    if (next === (item.text || "")) return;
    await onChange({ ...item, text: next });
  };

  const addNote = async (payload) => {
    await onChange({ ...item, notes: [...notes, { ...payload, at: new Date().toISOString() }] });
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  const saveNote = (index, patch) =>
    onChange({ ...item, notes: notes.map((note, i) => (i === index ? { ...note, ...patch } : note)) });

  const deleteNote = (index) =>
    onChange({ ...item, notes: notes.filter((_, i) => i !== index) });

  const note = openNote !== null ? notes[openNote] : null;

  if (note) {
    return (
      <NoteUnitView
        item={note}
        onBack={() => setOpenNote(null)}
        onChange={(patch) => saveNote(openNote, patch)}
        onDelete={() => {
          deleteNote(openNote);
          setOpenNote(null);
        }}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="tw-head">
        <button type="button" className="tw-back" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5" />
          The note
        </button>
        <span className="tw-head-stamp">
          {item.at ? format(new Date(item.at), "d MMM · h:mm a") : "just now"}
        </span>
        <div className="tw-head-tools">
          <button
            type="button"
            className="tw-icon-btn"
            onClick={() => { setEditing(true); setConfirming(false); }}
            aria-label="Edit this addition"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="tw-icon-btn tw-icon-danger"
            onClick={() => setConfirming(true)}
            aria-label="Delete this addition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="tw-scroll tw-detail-scroll">
        <div className="tw-detail-inner">
          <h1 className="tw-detail-title">{title}</h1>

          <article className="tw-note tw-detail-note">
            <span className="tw-pin" aria-hidden="true" />
            <NoteBlockHead label="One you added" editing={editing} onEdit={() => setEditing(true)} />

            {editing ? (
              <>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { setEditing(false); setDraft(item.text || ""); }
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveText();
                  }}
                  aria-label="Edit this addition"
                  className="tw-edit"
                  autoFocus
                />
                <div className="tw-foot">
                  <button onClick={saveText} className="tw-do">
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
                {item.text && <p className="tw-body">{item.text}</p>}
                {photo && <img src={photo} alt="A photo you added" className="tw-photo" />}
                {voice && <audio controls preload="none" src={voice} className="tw-audio tw-audio-lead" />}
              </>
            )}

            {confirming && (
              <div className="tw-foot">
                <span className="tw-small" style={{ margin: 0, flex: 1 }}>Take this addition out?</span>
                <button onClick={onDelete} className="tw-do tw-do-danger">Delete</button>
                <button onClick={() => setConfirming(false)} className="tw-later">Keep it</button>
              </div>
            )}
          </article>

          {notes.length > 0 ? (
            <section className="tw-follows">
              <p className="tw-stamp">Went deeper</p>
              {notes.map((note, index) => (
                <NoteFollowUp
                  key={`${note.at}-${index}`}
                  item={note}
                  onSave={(patch) => saveNote(index, patch)}
                  onDelete={() => deleteNote(index)}
                  onOpen={() => setOpenNote(index)}
                />
              ))}
            </section>
          ) : (
            <p className="tw-small" style={{ margin: 0 }}>
              Nothing under this one yet. Say more below and it stacks here.
            </p>
          )}
        </div>
      </div>

      <div className="tw-bar">
        <NoteFollowUpBar onAdd={addNote} partnerName={partnerName} />
      </div>
    </div>
  );
}