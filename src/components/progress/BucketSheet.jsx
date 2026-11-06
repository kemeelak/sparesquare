import React from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { X } from "lucide-react";
import { LIFE_AREAS, areaOf } from "@/lib/lifeAreas";

export default function BucketSheet({ bucket, habits = [], onClose }) {
  const queryClient = useQueryClient();
  const inside = habits
    .filter((h) => areaOf(h) === bucket.key)
    .sort((a, b) => (b.scheduled_date || "").localeCompare(a.scheduled_date || ""))
    .slice(0, 20);

  const move = async (habit, key) => {
    await base44.entities.HabitBlock.update(habit.id, { life_area: key });
    queryClient.invalidateQueries({ queryKey: ["habits"] });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{bucket.emoji}</span>
            <p className="font-bold text-[#1A1A1A] text-lg">{bucket.label}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB]">
            <X className="w-4 h-4 text-[#8A8580]" />
          </button>
        </div>
        <p className="text-xs text-[#8A8580] mb-4">
          {bucket.hours}h this week toward ~{bucket.target}h. Tap another bucket to move something out.
        </p>

        {inside.length === 0 ? (
          <p className="text-sm text-[#B0AAA4] py-8 text-center">
            Nothing in here yet. Habits land here by their category, or the coach puts them here.
          </p>
        ) : (
          <div className="space-y-2">
            {inside.map((habit) => (
              <div key={habit.id} className="rounded-xl border border-[#E8E4DF] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-[#1A1A1A] leading-snug">{habit.title}</p>
                  <span className="text-[10px] text-[#8A8580] flex-shrink-0 tabular-nums">
                    {habit.duration_minutes ? `${habit.duration_minutes}m` : "—"}
                  </span>
                </div>
                <p className="text-[10px] text-[#B0AAA4] mt-0.5">
                  {habit.scheduled_date ? format(new Date(`${habit.scheduled_date}T12:00:00`), "MMM d") : "not scheduled"}
                  {habit.status === "completed" ? " · done" : ""}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  {LIFE_AREAS.map((area) => {
                    const active = areaOf(habit) === area.key;
                    return (
                      <button
                        key={area.key}
                        onClick={() => !active && move(habit, area.key)}
                        title={`Move to ${area.label}`}
                        className={`h-7 w-7 rounded-lg text-sm flex items-center justify-center border transition-colors ${
                          active
                            ? "border-transparent text-white"
                            : "border-[#E8E4DF] bg-white hover:bg-[#F5F0EB]"
                        }`}
                        style={active ? { backgroundColor: area.color } : undefined}
                      >
                        {area.emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}