import React, { useState } from "react";
import { Check, Clock, Loader2, Plus, X, Archive } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { areaMeta, CATEGORY_EMOJI } from "@/lib/lifeAreas";

// The move that came back with the reflection. It only lands on the grid if they say so.
export default function DumpActionCard({ entry }) {
  const [status, setStatus] = useState(entry.action_status === "kept" ? "kept" : "idle");
  const [hidden, setHidden] = useState(entry.action_status === "dropped");
  const queryClient = useQueryClient();
  const area = areaMeta(entry.action_life_area);

  const save = async (extra) => {
    setStatus("loading");
    await base44.entities.HabitBlock.create({
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
    setStatus("kept");
  };

  const addToGrid = () =>
    save({
      status: "confirmed",
      scheduled_date: format(new Date(), "yyyy-MM-dd"),
      scheduled_hour: Math.min(22, new Date().getHours() + 1),
    });

  const addToBacklog = () => save({ status: "backlog" });

  const drop = async () => {
    setHidden(true);
    await base44.entities.DumpEntry.update(entry.id, { action_status: "dropped" });
    queryClient.invalidateQueries({ queryKey: ["dumpEntries"] });
  };

  if (hidden || !entry.action_title) return null;

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
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <Clock className="w-3 h-3" />{entry.action_minutes || 20}min
        </span>
        <span>· {area.emoji} {area.short}</span>
        <span>{CATEGORY_EMOJI[entry.action_category] || "⚡"}</span>
      </p>
      <div className="tw-actions">
        <button onClick={addToGrid} disabled={status === "loading"} className="tw-do">
          {status === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Put it on today
        </button>
        <button onClick={addToBacklog} disabled={status === "loading"} className="tw-later">
          <Archive className="w-3.5 h-3.5" /> Later
        </button>
        <button onClick={drop} className="tw-drop" aria-label="Not for me">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}