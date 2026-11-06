import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ArrowUp, Check, Loader2, Pencil, Trash2 } from "lucide-react";
import DumpActionCard from "./DumpActionCard";
import { shortTitle } from "./DumpNoteFront";

// One dump, opened up: what they wrote, what came back, the move inside it,
// and everything they have piled onto it since.
export default function DumpNoteDetail({ entry, partnerName, reflecting, onBack }) {
  const [photo, setPhoto] = useState(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(entry.text || "");
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef(null);
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

  // The bar grows with what they write instead of scrolling inside a fixed box.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  const stamp = entry.created_date ? format(new Date(entry.created_date), "EEE d MMM · h:mm a") : "just now";
  const title = entry.title || shortTitle(entry.text) || (entry.photo_url ? "A photo you dropped" : "Untitled");
  const followUps = entry.follow_ups || [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dumpEntries"] });

  const addFollowUp = async () => {
    const next = draft.trim();
    if (!next || saving) return;
    setSaving(true);
    await base44.entities.DumpEntry.update(entry.id, {
      follow_ups: [...followUps, { text: next, at: new Date().toISOString() }],
    });
    setDraft("");
    refresh();
    setSaving(false);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

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
                <article key={`${item.at}-${index}`} className="tw-follow">
                  <p className="tw-body">{item.text}</p>
                  {item.at && (
                    <p className="tw-follow-stamp">{format(new Date(item.at), "d MMM · h:mm a")}</p>
                  )}
                </article>
              ))}
            </section>
          )}
        </div>
      </div>

      <div className="tw-bar">
        <div className="tw-composer">
          <div className="tw-compose-row">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addFollowUp(); }
              }}
              aria-label="Add a note to this"
              className="tw-textarea"
              placeholder={`Add to this note, or tell ${partnerName} more`}
            />
            <button
              type="button"
              onClick={addFollowUp}
              disabled={!draft.trim() || saving}
              className="tw-send"
              aria-label="Add this note"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}