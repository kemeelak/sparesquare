import React, { useState } from "react";
import { motion } from "framer-motion";
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="mt-3 flex items-center gap-2 text-xs font-medium text-[#7C9A82] bg-[#E8F0EA] rounded-xl px-3 py-2">
        <Check className="w-3.5 h-3.5" /> {entry.action_title} · saved
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="mt-3 bg-[#F5EDE4] border border-[#D4A574]/40 rounded-xl p-3">
      <div className="flex items-start gap-2 mb-2.5">
        <span className="text-base flex-shrink-0">{CATEGORY_EMOJI[entry.action_category] || "⚡"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1A1A1A] leading-tight">{entry.action_title}</p>
          {entry.action_description && (
            <p className="text-xs text-[#6B6560] mt-0.5 leading-snug">{entry.action_description}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-[#8A8580] flex items-center gap-1">
              <Clock className="w-3 h-3" />{entry.action_minutes || 20}min
            </span>
            <span className="text-xs text-[#8A8580]">· {area.emoji} {area.short}</span>
          </div>
        </div>
        <button onClick={drop} className="p-1 -m-1 text-[#B0AAA4] hover:text-[#1A1A1A] transition-colors" aria-label="Not for me">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={addToGrid} disabled={status === "loading"}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-semibold rounded-lg hover:bg-[#333] transition-colors disabled:opacity-60">
          {status === "loading" ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3" /> Put it on today</>}
        </button>
        <button onClick={addToBacklog} disabled={status === "loading"}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8E4DF] text-[#4A5568] text-xs font-semibold rounded-lg hover:bg-[#F5F0EB] transition-colors disabled:opacity-60">
          <Archive className="w-3 h-3" /> Later
        </button>
      </div>
    </motion.div>
  );
}