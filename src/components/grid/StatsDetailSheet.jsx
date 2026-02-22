import React from "react";
import { motion } from "framer-motion";
import { X, Check, Target } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const categoryEmoji = {
  fitness: "💪", mindfulness: "🧘", learning: "📚",
  nutrition: "🥗", sleep: "😴", productivity: "⚡",
  social: "❤️", creative: "🎨",
};

export default function StatsDetailSheet({ type, habits, date, onClose }) {
  const queryClient = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: (id) => base44.entities.HabitBlock.update(id, { status: "completed" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });

  const items = type === "completed"
    ? habits.filter(h => h.status === "completed")
    : habits.filter(h => h.status === "confirmed" || h.status === "suggested");

  const title = type === "completed" ? "Completed Today" : "Scheduled Today";
  const Icon = type === "completed" ? Check : Target;
  const iconColor = type === "completed" ? "text-[#7C9A82]" : "text-[#4A5568]";

  const formatHour = (h) => {
    if (h === 0) return "12:00 AM";
    if (h === 12) return "12:00 PM";
    if (h < 12) return `${h}:00 AM`;
    return `${h - 12}:00 PM`;
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
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md p-6 max-h-[70vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${iconColor}`} />
            <div>
              <p className="font-bold text-[#1A1A1A]">{title}</p>
              <p className="text-xs text-[#8A8580]">{format(date, "EEEE, MMMM d")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB]">
            <X className="w-5 h-5 text-[#8A8580]" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-10 text-[#B0AAA4] text-sm">
            {type === "completed" ? "Nothing completed yet — go get it! 💪" : "Nothing scheduled for today."}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((habit) => (
              <div key={habit.id} className="flex items-center gap-3 bg-[#F5F0EB] rounded-xl px-4 py-3">
                <span className="text-lg">{categoryEmoji[habit.category] || "⭐"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1A1A1A] truncate">{habit.title}</p>
                  <p className="text-xs text-[#8A8580]">
                    {habit.scheduled_hour != null ? formatHour(habit.scheduled_hour) : ""}
                    {habit.duration_minutes ? ` · ${habit.duration_minutes} min` : ""}
                  </p>
                </div>
                {habit.status === "completed" && (
                  <div className="w-6 h-6 rounded-full bg-[#7C9A82] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}