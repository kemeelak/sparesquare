import React, { useState } from "react";
import { Check, Clock, Loader2, Plus, X, Archive, ArrowRight, PenLine } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { areaMeta } from "@/lib/lifeAreas";
import ActionDraft from "./ActionDraft";

// The move that came back with the reflection. It only lands on the grid if they say so.
export default function DumpActionCard({ entry }) {
  const [status, setStatus] = useState(entry.action_status === "kept" ? "kept" : "idle");
  const [hidden, setHidden] = useState(entry.action_status === "dropped");
  const [movedTo, setMovedTo] = useState(null); // where it just landed: backlog | grid
  const [savedId, setSavedId] = useState(null);
  const queryClient = useQueryClient();
  const area = areaMeta(entry.action_life_area);
  const [draftOpen, setDraftOpen] = useState(false);

  // Only offer to write it when the move is something you actually send to someone.
  const moveText = `${entry.action_title || ""} ${entry.action_description || ""}`;
  const draftKind = /e-?mail/i.test(moveText)
    ? "email"
    : /\b(text|message|dm|reply|respond|reach out|check in|write to|call|apolog)/i.test(moveText)
      ? "message"
      : null;

  const save = async (extra, destination) => {
    setStatus("loading");
    const created = await base44.entities.HabitBlock.create({
      title: entry.action_title,
      description: entry.action_description || "",
      duration_minutes: entry.action_minutes || 20,
      category: entry.action_category || "general",
      life_area: entry.action_life_area || undefined,
      source: "From your dump",
      ...extra,
    });
    await base44.entities.DumpEntry.update(entry.id, { action_status: "kept" });
    queryClient.invalidateQueries({ queryKey: ["habits"] });
    queryClient.invalidateQueries({ queryKey: ["dumpEntries"] });
    setSavedId(created?.id || null);
    setMovedTo(destination);
  };

  const addToGrid = () =>
    save({
      status: "confirmed",
      scheduled_date: format(new Date(), "yyyy-MM-dd"),
      scheduled_hour: Math.min(22, new Date().getHours() + 1),
    }, "grid");

  const addToBacklog = () => save({ status: "backlog" }, "backlog");

  // They already did it — log it as done today so it counts on the grid and in their week.
  const didItNow = () =>
    save({
      status: "completed",
      scheduled_date: format(new Date(), "yyyy-MM-dd"),
      scheduled_hour: new Date().getHours(),
    }, "done");

  const drop = async () => {
    setHidden(true);
    await base44.entities.DumpEntry.update(entry.id, { action_status: "dropped" });
    queryClient.invalidateQueries({ queryKey: ["dumpEntries"] });
  };

  if (hidden || !entry.action_title) return null;

  const donePrefix = (to) => (to === "done" ? "Done — " : "");

  // It just moved: the card turns into a link straight to where it went.
  if (movedTo) {
    return (
      <motion.div
        className="tw-moved"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.2, 0.8, 0.25, 1] }}
      >
        <span className="tw-moved-text">
          <Check className="w-4 h-4" /> {donePrefix(movedTo)}{entry.action_title}
        </span>
        <Link
          to={movedTo === "backlog" ? `/Backlog?highlight=${savedId || ""}` : "/"}
          className="tw-moved-link"
        >
          {movedTo === "backlog" ? "Open it in your backlog" : movedTo === "done" ? "Logged on your grid" : "On your grid"}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </motion.div>
    );
  }

  if (status === "kept") {
    return (
      <p className="tw-kept">
        <Check className="w-3.5 h-3.5" /> {entry.action_title} · saved
      </p>
    );
  }

  return (
    <div>
      <p className="tw-action-title">{entry.action_title}</p>
      {entry.action_description && <p className="tw-action-copy">{entry.action_description}</p>}
      <p className="tw-action-meta">
        {entry.action_minutes ? (
          <span className="tw-meta-bit"><Clock className="w-3 h-3" />{entry.action_minutes} min</span>
        ) : null}
        <span className="tw-meta-bit">{area.emoji} {area.short}</span>
      </p>
      <div className="tw-actions">
        <button onClick={didItNow} disabled={status === "loading"} className="tw-do tw-do-done">
          {status === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          I did it now
        </button>
        <button onClick={addToGrid} disabled={status === "loading"} className="tw-later">
          {status === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Put it on my grid
        </button>
        <button onClick={addToBacklog} disabled={status === "loading"} className="tw-later">
          <Archive className="w-3.5 h-3.5" />
          Save for later
        </button>
        <button onClick={drop} className="tw-drop" aria-label="Not this one">
          <X className="w-4 h-4" />
        </button>
      </div>

      {draftKind && (draftOpen || entry.action_draft ? (
        <ActionDraft entry={entry} kind={draftKind} />
      ) : (
        <button onClick={() => setDraftOpen(true)} className="tw-do tw-draft-btn">
          <PenLine className="w-3.5 h-3.5" />
          {draftKind === "email" ? "Draft the email for me" : "Draft it for me"}
        </button>
      ))}
    </div>
  );
}