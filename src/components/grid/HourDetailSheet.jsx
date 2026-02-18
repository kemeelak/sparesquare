import React from "react";
import { motion } from "framer-motion";
import { X, Check, Sparkles, Lock, Moon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function HourDetailSheet({ hour, date, habits, unmovables, sleepHours, onClose, onConfirm, onComplete }) {
  const formatHour = (h) => {
    if (h === 0) return "12:00 AM";
    if (h === 12) return "12:00 PM";
    if (h < 12) return `${h}:00 AM`;
    return `${h - 12}:00 PM`;
  };

  const dateStr = format(date, "yyyy-MM-dd");
  const dayName = format(date, "EEEE").toLowerCase();
  const habit = habits?.find(h => h.scheduled_hour === hour && h.scheduled_date === dateStr && h.status !== "backlog");
  const unmovable = unmovables?.find(u => u.start_hour <= hour && u.end_hour > hour && (u.days?.includes(dayName) || u.days?.length === 0));
  const isSleep = sleepHours?.includes(hour);
  const isSpare = !habit && !unmovable && !isSleep;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md p-6 lg:p-8"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-lg font-bold text-[#1A1A1A]">{formatHour(hour)}</p>
            <p className="text-sm text-[#8A8580]">{format(date, "EEEE, MMMM d")}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB]">
            <X className="w-5 h-5 text-[#8A8580]" />
          </button>
        </div>

        {unmovable && (
          <div className="bg-[#4A5568] text-white rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-semibold">Unmovable</span>
            </div>
            <p className="text-lg font-bold">{unmovable.label}</p>
          </div>
        )}

        {isSleep && (
          <div className="bg-[#2D3748] text-white rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="w-4 h-4" />
              <span className="text-sm font-semibold">Sleep Time</span>
            </div>
            <p className="text-sm text-[#A0AEC0]">Rest is essential for growth. Protect this time.</p>
          </div>
        )}

        {habit && (
          <div className={`rounded-2xl p-5 ${habit.status === "confirmed" || habit.status === "completed" ? "bg-[#7C9A82] text-white" : "bg-[#E8F0EA] text-[#1A1A1A]"}`}>
            <p className="text-lg font-bold mb-1">{habit.title}</p>
            {habit.description && <p className="text-sm opacity-80 mb-3">{habit.description}</p>}
            {habit.source && <p className="text-xs opacity-60 mb-4">From: {habit.source}</p>}
            <div className="flex gap-2">
              {habit.status === "suggested" && (
                <Button onClick={() => onConfirm(habit)} className="bg-[#7C9A82] hover:bg-[#6B8A71] text-white rounded-xl">
                  <Check className="w-4 h-4 mr-2" /> Confirm
                </Button>
              )}
              {(habit.status === "confirmed" || habit.status === "suggested") && (
                <Button onClick={() => onComplete(habit)} variant="outline" className="rounded-xl border-white/30 text-inherit hover:bg-white/10">
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        )}

        {isSpare && (
          <div className="bg-[#F5EDE4] rounded-2xl p-5 border border-dashed border-[#D4A574]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#D4A574]" />
              <span className="text-sm font-semibold text-[#D4A574]">Spare Square</span>
            </div>
            <p className="text-sm text-[#8A8580]">This hour is free. Chat with your Partner to fill it with a growth habit!</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}