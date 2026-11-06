import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ArrowRight, Check, Pencil, Sparkles, Trash2 } from "lucide-react";
import DumpActionCard from "./DumpActionCard";
import NoteAdditionView from "./NoteAdditionView";
import NoteBlockHead from "./NoteBlockHead";
import NoteExploreView from "./NoteExploreView";
import NoteFollowUp from "./NoteFollowUp";
import NoteFollowUpBar from "./NoteFollowUpBar";
import { shortTitle } from "./DumpNoteFront";

// One dump, opened up: what they wrote and what came back on the same sheet,
// the move inside it, and everything they have piled onto it since.
export default function DumpNoteDetail({ entry, partnerName, reflecting, onBack }) {
  const [photo, setPhoto] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(entry.text || "");
  const [confirming, setConfirming] = useState(false);
  const [openAddition, setOpenAddition] = useState(null);
  const [exploring, setExploring] = useState(false);
  const [editingReflection, setEditingReflection] = useState(false);
  const [reflectionDraft, setReflectionDraft] = useState(entry.reflection || "");
  const [kept, setKept] = useState([]);
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

  // Everything they kept while digging stays with the note, so walking out doesn't lose it.
  useEffect(() => {
    let alive = true;
    base44.entities.NoteExploration
      .filter({ entry_id: entry.id }, "-created_date", 20)
      .then((page) => {
        if (!alive) return;
        const rows = page?.items ?? page ?? [];
        setKept(rows.flatMap((row) => row.bookmarks || []));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [entry.id, exploring]);

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

  const updateFollowUp = (index, next) =>
    saveFollowUps(followUps.map((item, i) => (i === index ? next : item)));

  const editFollowUp = (index, patch) => updateFollowUp(index, { ...followUps[index], ...patch });

  const deleteFollowUp = (index) => saveFollowUps(followUps.filter((_, i) => i !== index));

  const saveEdit = async () => {
    const next = editDraft.trim();
    setEditing(false);
    if (!next || next === entry.text) return;
    await base44.entities.DumpEntry.update(entry.id, { text: next });
    refresh();
  };

  const saveReflection = async () => {
    const next = reflectionDraft.trim();
    setEditingReflection(false);
    if (!next || next === entry.reflection) return;
    await base44.entities.DumpEntry.update(entry.id, { reflection: next });
    refresh();
  };

  const cancelReflection = () => {
    setEditingReflection(false);
    setReflectionDraft(entry.reflection || "");
  };

  const remove = async () => {
    setConfirming(false);
    await base44.entities.DumpEntry.delete(entry.id);
    refresh();
    onBack();
  };

  const addition = openAddition !== null ? followUps[openAddition] : null;

  if (addition) {
    return (
      <NoteAdditionView
        item={addition}
        entryId={entry.id}
        partnerName={partnerName}
        onBack={() => setOpenAddition(null)}
        onChange={(next) => updateFollowUp(openAddition, next)}
        onDelete={async () => {
          await deleteFollowUp(openAddition);
          setOpenAddition(null);
        }}
      />
    );
  }

  if (exploring) {
    return (
      <NoteExploreView
        entryId={entry.id}
        subject={entry.text}
        context={entry.reflection || ""}
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

            <div className="tw-block">
              <NoteBlockHead
                label="What you wrote"
                editing={editing}
                onEdit={() => { setEditing(true); setConfirming(false); }}
              />

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
            </div>

            <div className="tw-block">
              <NoteBlockHead
                label="Back to you"
                editing={editingReflection}
                onEdit={entry.reflection ? () => setEditingReflection(true) : undefined}
              />
              {reflecting ? (
                <p className="tw-scribble animate-pulse">Reading it…</p>
              ) : editingReflection ? (
                <>
                  <textarea
                    value={reflectionDraft}
                    onChange={(e) => setReflectionDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") cancelReflection();
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveReflection();
                    }}
                    aria-label="Edit what came back"
                    className="tw-edit"
                    autoFocus
                  />
                  <div className="tw-foot">
                    <button onClick={saveReflection} className="tw-do">
                      <Check className="w-3.5 h-3.5" />
                      Save
                    </button>
                    <button onClick={cancelReflection} className="tw-later">
                      Cancel
                    </button>
                  </div>
                </>
              ) : entry.reflection ? (
                <button
                  type="button"
                  className="tw-scribble tw-scribble-btn"
                  onClick={() => setExploring(true)}
                  aria-label="Keep digging into this"
                >
                  {entry.reflection}
                  <span className="tw-scribble-more">
                    Keep going
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              ) : (
                <p className="tw-small" style={{ margin: 0 }}>Nothing came back on this one.</p>
              )}

              {!reflecting && entry.library_source && (
                <p className="tw-lib-chip">📚 From your library · {entry.library_source}</p>
              )}

              {!reflecting && entry.reflection && <DumpActionCard entry={entry} />}

              {!reflecting && !editing && !editingReflection && (
                <button
                  type="button"
                  className="tw-explore-cta"
                  onClick={() => setExploring(true)}
                >
                  <Sparkles className="w-4 h-4" />
                  Dig deeper into this with {partnerName || "your partner"}
                </button>
              )}
            </div>
          </article>

          {kept.length > 0 && (
            <section className="tw-kept-points">
              <p className="tw-stamp">Kept while digging</p>
              <ul className="tw-kept-list">
                {kept.map((point, index) => (
                  <li key={`${point.key}-${index}`}>
                    <button type="button" className="tw-kept-item tw-kept-btn" onClick={() => setExploring(true)}>
                      <span className="tw-kept-body">
                        <span className="tw-kept-label">{point.label || "A point"}</span>
                        {point.detail && <span className="tw-kept-detail">{point.detail}</span>}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {followUps.length > 0 && (
            <section className="tw-follows">
              <p className="tw-stamp">Added since</p>
              {followUps.map((item, index) => (
                <NoteFollowUp
                  key={`${item.at}-${index}`}
                  item={item}
                  onSave={(patch) => editFollowUp(index, patch)}
                  onDelete={() => deleteFollowUp(index)}
                  onOpen={() => setOpenAddition(index)}
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