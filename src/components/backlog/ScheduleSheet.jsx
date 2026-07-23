import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, RefreshCw, CalendarDays } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { Button } from "@/components/ui/button";

const REPEAT_OPTIONS = [
  { value: "none", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const formatHour = (h) => {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
};

export default function ScheduleSheet({ habit, habits = [], profile, onClose, onSchedule }) {
  const [date, setDate] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(null);
  const [repeat, setRepeat] = useState("none");

  const dateStr = format(date, "yyyy-MM-dd");
  
  const dayName = format(date, "EEEE").toLowerCase(); // e.g. "monday"

  // Compute busy hours for the selected date
  const busyHours = useMemo(() => {
    const busy = new Set();

    // Hours occupied by scheduled habits on this date
    if (habits) {
      habits.forEach((h) => {
        if (
          h.status !== "backlog" &&
          h.scheduled_date === dateStr &&
          h.scheduled_hour != null
        ) {
          const h0 = Math.floor(h.scheduled_hour);
          const durationHours = Math.ceil((h.duration_minutes || 15) / 60);
          for (let i = 0; i < durationHours; i++) busy.add(h0 + i);
        }
      });
    }

    // Hours occupied by unmovable blocks on this day
    if (profile?.unmovables) {
      profile.unmovables.forEach((block) => {
        const blockDays = block.days || [];
        if (blockDays.length === 0 || blockDays.map(d => d.toLowerCase()).includes(dayName)) {
          for (let h = Math.floor(block.start_hour); h < Math.ceil(block.end_hour); h++) {
            busy.add(h);
          }
        }
      });
    }

    // Sleep hours
    if (profile?.wake_time && profile?.sleep_actual) {
      const parseHour = (t) => {
        if (!t) return null;
        const match = t.match(/(\d+):?(\d*)\s*(AM|PM)/i);
        if (!match) return null;
        let h = parseInt(match[1]);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && h !== 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
        return h;
      };
      const wake = parseHour(profile.wake_time);
      const sleep = parseHour(profile.sleep_actual);
      if (wake != null && sleep != null) {
        // Sleep from sleep hour to midnight, and midnight to wake
        for (let h = 0; h < wake; h++) busy.add(h);
        for (let h = sleep; h < 24; h++) busy.add(h);
      }
    }

    return busy;
  }, [habits, profile, dateStr, dayName]);

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
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#1A1A1A]">{habit.title}</h2>
              <p className="text-xs text-[#8A8580] mt-0.5">{habit.duration_minutes || 15}min · {habit.energy_level || "medium"} energy</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB]">
              <X className="w-5 h-5 text-[#8A8580]" />
            </button>
          </div>

          {/* Repeat toggle */}
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <RefreshCw className="w-3.5 h-3.5 text-[#8A8580]" />
              <p className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide">Repeat</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {REPEAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRepeat(opt.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border
                    ${repeat === opt.value
                      ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                      : "bg-white text-[#4A5568] border-[#E8E4DF] hover:border-[#1A1A1A]"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date selector — only show for non-daily repeats */}
          {repeat !== "daily" && repeat !== "weekdays" && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <CalendarDays className="w-3.5 h-3.5 text-[#8A8580]" />
                <p className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide">
                  {repeat === "weekly" ? "Starting day" : repeat === "monthly" ? "Starting date" : "Date"}
                </p>
              </div>
              <div className="flex items-center justify-between bg-[#F5F0EB] rounded-xl p-3">
                <button onClick={() => setDate(subDays(date, 1))} className="p-1">
                  <ChevronLeft className="w-4 h-4 text-[#8A8580]" />
                </button>
                <p className="text-sm font-medium text-[#1A1A1A]">{format(date, "EEEE, MMM d")}</p>
                <button onClick={() => setDate(addDays(date, 1))} className="p-1">
                  <ChevronRight className="w-4 h-4 text-[#8A8580]" />
                </button>
              </div>
            </div>
          )}

          {/* Hour picker */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide">Available Times</p>
              <p className="text-[10px] text-[#B0AAA4]">{24 - busyHours.size} free hours</p>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {Array.from({ length: 24 }, (_, h) => h).map((h) => {
                const isBusy = busyHours.has(h);
                const isSelected = selectedHour === h;
                return (
                  <button
                    key={h}
                    onClick={() => !isBusy && setSelectedHour(h)}
                    disabled={isBusy}
                    className={`py-2 px-3 rounded-xl text-sm font-medium transition-all
                      ${isSelected
                        ? "bg-[#7C9A82] text-white"
                        : isBusy
                          ? "bg-[#F5F0EB] text-[#C0BAB4] line-through cursor-not-allowed opacity-40"
                          : "bg-[#F5F0EB] text-[#8A8580] hover:bg-[#E8E4DF]"
                      }`}
                  >
                    {formatHour(h)}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={() => onSchedule(selectedHour, date, repeat)}
            disabled={selectedHour === null}
            className="w-full h-12 rounded-xl bg-[#7C9A82] hover:bg-[#6B8A71] text-white"
          >
            {repeat === "none"
              ? `Schedule at ${selectedHour !== null ? formatHour(selectedHour) : "..."}`
              : `Add as ${REPEAT_OPTIONS.find(r => r.value === repeat)?.label} habit at ${selectedHour !== null ? formatHour(selectedHour) : "..."}`}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}