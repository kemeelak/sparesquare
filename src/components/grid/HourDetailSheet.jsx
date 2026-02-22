import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Check, Sparkles, Lock, Moon, Plus, ArrowRight } from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "../../utils";
import AddEventForm from "./AddEventForm";

export default function HourDetailSheet({ hour, date, habits, unmovables, sleepHours, profile, onClose, onConfirm, onComplete, onCompleteById }) {
  const [showAddEvent, setShowAddEvent] = useState(false);
  const queryClient = useQueryClient();

  const formatHour = (h) => {
    if (h === 0) return "12:00 AM";
    if (h === 12) return "12:00 PM";
    if (h < 12) return `${h}:00 AM`;
    return `${h - 12}:00 PM`;
  };

  const dateStr = format(date, "yyyy-MM-dd");
  const dayName = format(date, "EEEE").toLowerCase();
  const hourHabits = habits?.filter(h => h.scheduled_hour === hour && h.scheduled_date === dateStr && h.status !== "backlog") || [];
  const habit = hourHabits[0] || null;
  const unmovable = unmovables?.find(u => u.start_hour <= hour && u.end_hour > hour && (u.days?.includes(dayName) || u.days?.length === 0));
  const isSleep = sleepHours?.includes(hour);
  const isSpare = !habit && !unmovable && !isSleep;

  // Backlog habits for suggestions
  const backlogHabits = habits?.filter(h => h.status === "backlog") || [];

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.HabitBlock.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });

  const scheduleBacklogMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.HabitBlock.update(id, {
      status: "confirmed",
      scheduled_date: dateStr,
      scheduled_hour: hour,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      onClose();
    },
  });

  const DAY_MAP = { mon: "monday", tue: "tuesday", wed: "wednesday", thu: "thursday", fri: "friday", sat: "saturday", sun: "sunday" };
  const WEEKDAYS = ["monday","tuesday","wednesday","thursday","friday"];

  const getDatesToSchedule = (repeat) => {
    if (repeat === "none" || !repeat) return [dateStr];
    if (Array.isArray(repeat)) {
      const dates = [];
      const start = new Date(date);
      for (let i = 0; i < 60; i++) {
        const d = addDays(start, i);
        const dayName = format(d, "EEEE").toLowerCase();
        const dStr = format(d, "yyyy-MM-dd");
        if (repeat.some(r => DAY_MAP[r] === dayName)) dates.push(dStr);
      }
      return dates;
    }
    const dates = [];
    const start = new Date(date);
    for (let i = 0; i < 60; i++) {
      const d = addDays(start, i);
      const dayName = format(d, "EEEE").toLowerCase();
      const dStr = format(d, "yyyy-MM-dd");
      if (repeat === "daily") dates.push(dStr);
      else if (repeat === "weekdays" && WEEKDAYS.includes(dayName)) dates.push(dStr);
      else if (repeat === "weekly" && i % 7 === 0) dates.push(dStr);
      else if (DAY_MAP[repeat] === dayName) dates.push(dStr);
    }
    return dates;
  };

  const handleSaveEvent = async ({ title, duration, category, energy, repeat }) => {
    const dates = getDatesToSchedule(repeat);
    await Promise.all(dates.map(d =>
      createEventMutation.mutateAsync({
        title,
        status: "confirmed",
        scheduled_date: d,
        scheduled_hour: hour,
        duration_minutes: duration,
        category,
        energy_level: energy,
      })
    ));
    setShowAddEvent(false);
    onClose();
  };

  const partnerName = profile?.partner_name || "Partner";

  const goToPartner = () => {
    const prompt = encodeURIComponent(
      `I have a spare hour at ${formatHour(hour)}. Based on my goals and what you know about me, what are 2–3 things I could do right now?`
    );
    window.location.href = createPageUrl("Partner") + `?hour=${hour}&date=${dateStr}&autoPrompt=${prompt}`;
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
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md p-6 lg:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-lg font-bold text-[#1A1A1A]">{formatHour(hour)}</p>
            <p className="text-sm text-[#8A8580]">{format(date, "EEEE, MMMM d")}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Manual add event button - always visible */}
            {!showAddEvent && (
              <button
                onClick={() => setShowAddEvent(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F0EB] text-[#4A5568] text-sm font-medium hover:bg-[#E8E4DF] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Event
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB]">
              <X className="w-5 h-5 text-[#8A8580]" />
            </button>
          </div>
        </div>

        {/* Add Event Form */}
        {showAddEvent && (
          <AddEventForm
            hour={hour}
            dateStr={dateStr}
            onSave={handleSaveEvent}
            onCancel={() => setShowAddEvent(false)}
            isPending={createEventMutation.isPending}
          />
        )}

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

        {hourHabits.length > 0 && (
          <div className="space-y-3">
            {hourHabits.map((h, i) => {
              const isConfirmed = h.status === "confirmed" || h.status === "completed";
              const isCompleted = h.status === "completed";
              // Calculate per-habit start time based on order
              const prevMinutes = hourHabits.slice(0, i).reduce((sum, p) => sum + (p.duration_minutes || 30), 0);
              const startMin = prevMinutes % 60;
              const startHourOffset = Math.floor(prevMinutes / 60);
              const startH = hour + startHourOffset;
              const timeLabel = `${startH > 12 ? startH - 12 : startH || 12}:${String(startMin).padStart(2,"0")} ${startH >= 12 ? "PM" : "AM"}`;
              return (
                <div key={h.id} className={`rounded-2xl p-5 ${isConfirmed ? "bg-[#7C9A82] text-white" : "bg-[#E8F0EA] text-[#1A1A1A]"}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-lg font-bold leading-tight">{h.title}</p>
                    <span className={`text-xs font-mono mt-1 flex-shrink-0 ${isConfirmed ? "text-white/70" : "text-[#8A8580]"}`}>{timeLabel}</span>
                  </div>
                  {h.duration_minutes && <p className={`text-xs mb-1 ${isConfirmed ? "text-white/70" : "text-[#8A8580]"}`}>{h.duration_minutes} min</p>}
                  {h.description && <p className="text-sm opacity-80 mb-3">{h.description}</p>}
                  {h.source && <p className="text-xs opacity-60 mb-3">From: {h.source}</p>}
                  {!isCompleted && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {h.status === "suggested" && (
                        <Button onClick={() => onConfirm(h)} size="sm" className="bg-[#7C9A82] hover:bg-[#6B8A71] text-white rounded-xl">
                          <Check className="w-3.5 h-3.5 mr-1" /> Confirm
                        </Button>
                      )}
                      {(h.status === "confirmed" || h.status === "suggested") && (
                        <Button onClick={() => onComplete(h)} size="sm" className="rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/40">
                          ✓ Mark Complete
                        </Button>
                      )}
                    </div>
                  )}
                  {isCompleted && <p className="text-sm font-semibold mt-2 opacity-80">✅ Completed</p>}
                </div>
              );
            })}
          </div>
        )}

        {isSpare && !showAddEvent && (
          <div className="space-y-3">
            <div className="bg-[#F5EDE4] rounded-2xl p-5 border border-dashed border-[#D4A574]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#D4A574]" />
                <span className="text-sm font-semibold text-[#D4A574]">Spare Square</span>
              </div>
              <p className="text-sm text-[#8A8580]">This hour is free — a growth window waiting to be filled.</p>
            </div>

            {/* Backlog suggestions */}
            {backlogHabits.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#8A8580] mb-2 uppercase tracking-wide">From your backlog</p>
                <div className="space-y-2">
                  {backlogHabits.slice(0, 3).map((bh) => (
                    <button
                      key={bh.id}
                      onClick={() => scheduleBacklogMutation.mutate({ id: bh.id })}
                      disabled={scheduleBacklogMutation.isPending}
                      className="w-full flex items-center justify-between bg-white rounded-xl border border-[#E8E4DF] px-4 py-3 hover:border-[#7C9A82] hover:bg-[#E8F0EA] transition-all group"
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-[#1A1A1A]">{bh.title}</p>
                        {bh.duration_minutes && <p className="text-xs text-[#8A8580]">{bh.duration_minutes} min</p>}
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#B0AAA4] group-hover:text-[#7C9A82]" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ask Partner */}
            <Button
              onClick={goToPartner}
              className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white rounded-xl h-11"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Ask {partnerName} what to do here
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}