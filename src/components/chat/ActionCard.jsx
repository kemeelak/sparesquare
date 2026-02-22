import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Plus, AlarmClock, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const categoryEmoji = {
  fitness: "🏃", mindfulness: "🧘", learning: "📚", nutrition: "🥗",
  sleep: "😴", productivity: "⚡", social: "👥", creative: "🎨", general: "💬",
};

export default function ActionCard({ action, source }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done
  const queryClient = useQueryClient();

  const handleAddToGrid = async () => {
    setStatus("loading");
    const today = format(new Date(), "yyyy-MM-dd");
    await base44.entities.HabitBlock.create({
      title: action.title,
      description: action.description || "",
      duration_minutes: action.duration_minutes || 30,
      category: action.category || "general",
      energy_level: action.energy_level || "medium",
      scheduled_hour: action.scheduled_hour ?? new Date().getHours() + 1,
      scheduled_date: action.scheduled_date || today,
      status: "confirmed",
      source: source || "Partner suggestion",
    });
    queryClient.invalidateQueries({ queryKey: ["habits"] });
    setStatus("done");
  };

  const handleAddToBacklog = async () => {
    setStatus("loading");
    await base44.entities.HabitBlock.create({
      title: action.title,
      description: action.description || "",
      duration_minutes: action.duration_minutes || 30,
      category: action.category || "general",
      energy_level: action.energy_level || "medium",
      status: "backlog",
      source: source || "Partner suggestion",
    });
    queryClient.invalidateQueries({ queryKey: ["habits"] });
    setStatus("done");
  };

  const handleUpdateSleep = async () => {
    if (!action.sleep_goal) return;
    setStatus("loading");
    const profiles = await base44.entities.UserProfile.list();
    if (profiles[0]) {
      await base44.entities.UserProfile.update(profiles[0].id, { sleep_goal: action.sleep_goal });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    }
    setStatus("done");
  };

  const isHabit = action.type === "habit" || action.title;
  const isSleepUpdate = action.type === "sleep_update";

  if (status === "done") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="mt-2 flex items-center gap-2 text-xs text-[#7C9A82] font-medium bg-[#E8F0EA] rounded-xl px-3 py-2">
        <CheckCircle2 className="w-3.5 h-3.5" /> Added to your grid ✓
      </motion.div>
    );
  }

  if (isSleepUpdate) {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="mt-2 bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlarmClock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-indigo-800">Update sleep goal → {action.sleep_goal}</p>
            {action.description && <p className="text-xs text-indigo-600 mt-0.5">{action.description}</p>}
          </div>
        </div>
        <button onClick={handleUpdateSleep} disabled={status === "loading"}
          className="flex-shrink-0 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1">
          {status === "loading" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Update"}
        </button>
      </motion.div>
    );
  }

  if (isHabit) {
    const hour = action.scheduled_hour;
    const timeLabel = hour != null
      ? (hour === 0 ? "12:00 AM" : hour === 12 ? "12:00 PM" : hour < 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`)
      : null;

    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="mt-2 bg-[#F5EDE4] border border-[#D4A574]/40 rounded-xl p-3">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-base flex-shrink-0">{categoryEmoji[action.category] || "⚡"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1A1A] leading-tight">{action.title}</p>
            {action.description && <p className="text-xs text-[#6B6560] mt-0.5 leading-snug">{action.description}</p>}
            <div className="flex items-center gap-2 mt-1">
              {timeLabel && <span className="text-xs text-[#8A8580] flex items-center gap-1"><Clock className="w-3 h-3" />{timeLabel}</span>}
              {action.duration_minutes && <span className="text-xs text-[#8A8580]">· {action.duration_minutes}min</span>}
              {action.energy_level && <span className="text-xs text-[#8A8580]">· {action.energy_level} energy</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAddToGrid} disabled={status === "loading"}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-semibold rounded-lg hover:bg-[#333] transition-colors">
            {status === "loading" ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3" /> Add to Grid</>}
          </button>
          <button onClick={handleAddToBacklog} disabled={status === "loading"}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8E4DF] text-[#4A5568] text-xs font-semibold rounded-lg hover:bg-[#F5F0EB] transition-colors">
            Backlog
          </button>
        </div>
      </motion.div>
    );
  }

  return null;
}