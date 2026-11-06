import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Check, Pencil, Trash2 } from "lucide-react";
import DumpActionCard from "./DumpActionCard";
import NoteFollowUp from "./NoteFollowUp";
import NoteFollowUpBar from "./NoteFollowUpBar";
import { shortTitle } from "./DumpNoteFront";

// One dump, opened up: what they wrote, what came back, the move inside it,
// and everything they have piled onto it since.
export default function DumpNoteDetail({ entry, partnerName, reflecting, onBack }) {
  const [photo, setPhoto] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(entry.text || "");
  const [confirming, setConfirming] = useState(false);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let alive = true;
    if (!entry.photo_url) return undefined;
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: entry.photo_url, expires_in: 3600 })
      .then((res) => { if (alive) setPhoto(res?.signed_url || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [entry.photo_url]);

  const stamp = entry.created_date ? format(new Date(entry.created_date), "EEE d MMM · h:mm a") : "just now";
  const title = entry.title || shortTitle(entry.text) || (entry.photo_url ? "A photo you dropped" : "Untitled");
  const followUps = entry.follow_ups || [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dumpEntries"] });

  const saveFollowUps = async (next) => {
    await base44.entities.DumpEntry.update(entry.id, { follow_ups: next });
    refresh();
  };

  const addFollowUp = async (payload) => {
    await saveFollowUps([...followUps, { ...payload, at: new Date().toISOString() }]);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  const editFollowUp = (index, patch) =>
    saveFollowUps(followUps.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const deleteFollowUp = (index) => saveFollowUps(followUps.filter((_, i) => i !== index));

  const saveEdit = async () => {
    const next = editDraft.trim();
    setEditing(false);
    if (!next || next === entry.text) return;
    await base44.entities.DumpEntry.update(entry.id, { text: next });
    refresh();
  };

  const remove = async () => {
    setConfirming(false);
    await base44.entities.DumpEntry.delete(entry.id);
    refresh();
    onBack();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="tw-head">
        <button type="button" className="tw-back" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5" />
          All notes
        </button>
        <span className="tw-head-stamp">{stamp}</span>
        <div className="tw-head-tools">
          <button
            type="button"
            className="tw-icon-btn"
            onClick={() => { setEditing(true); setConfirming(false); }}
            aria-label="Edit what you wrote"
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

      <div ref={scrollRef} className="tw-scroll tw-detail-scroll">
        <div className="tw-detail-inner">
          <h1 className="tw-detail-title">{title}</h1>

          <article className="tw-note tw-detail-note">
            <span className="tw-pin" aria-hidden="true" />
            <p className="tw-stamp">What you wrote</p>

            {editing ? (
              <>
                <textarea
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { setEditing(false); setEditDraft(entry.text || ""); }
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit();
                  }}
                  aria-label="Edit this note"
                  className="tw-edit"
                  autoFocus
                />
                <div className="tw-foot">
                  <button onClick={saveEdit} className="tw-do">
                    <Check className="w-3.5 h-3.5" />
                    Save
                  </button>
                  <button onClick={() => { setEditing(false); setEditDraft(entry.text || ""); }} className="tw-later">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                {entry.text ? <p className="tw-body">{entry.text}</p> : <p className="tw-small" style={{ margin: 0 }}>No words, just the photo.</p>}
                {photo && <img src={photo} alt="What you dropped in" className="tw-photo" />}
              </>
            )}

            {confirming && (
              <div className="tw-foot">
                <span className="tw-small" style={{ margin: 0, flex: 1 }}>Delete this note for good?</span>
                <button onClick={remove} className="tw-do tw-do-danger">Delete</button>
                <button onClick={() => setConfirming(false)} className="tw-later">Keep it</button>
              </div>
            )}
          </article>

          <article className="tw-note tw-note-answer tw-detail-answer">
            <span className="tw-pin tw-pin-alt" aria-hidden="true" />
            <p className="tw-stamp">Back to you</p>
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

          {followUps.length > 0 && (
            <section className="tw-follows">
              <p className="tw-stamp">Added since</p>
              {followUps.map((item, index) => (
                <NoteFollowUp
                  key={`${item.at}-${index}`}
                  item={item}
                  onSave={(patch) => editFollowUp(index, patch)}
                  onDelete={() => deleteFollowUp(index)}
                />
              ))}
            </section>
          )}
        </div>
      </div>

      <div className="tw-bar">
        <NoteFollowUpBar onAdd={addFollowUp} partnerName={partnerName} />
      </div>
    </div>
  );
}