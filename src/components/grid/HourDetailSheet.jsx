import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Check, Sparkles, Lock, Moon, Plus, ArrowRight } from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "../../utils";
import AddEventForm from "./AddEventForm";

export default function HourDetailSheet({ hour, date, habits, unmovables, sleepHours, onClose, onConfirm, onComplete }) {
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDuration, setEventDuration] = useState(1);
  const queryClient = useQueryClient();

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

  // Backlog habits for suggestions
  const backlogHabits = habits?.filter(h => h.status === "backlog") || [];

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.HabitBlock.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      onClose();
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

  const handleAddEvent = () => {
    if (!eventTitle.trim()) return;
    createEventMutation.mutate({
      title: eventTitle.trim(),
      status: "confirmed",
      scheduled_date: dateStr,
      scheduled_hour: hour,
      duration_minutes: eventDuration * 60,
    });
  };

  const goToPartner = () => {
    window.location.href = createPageUrl("Partner") + `?hour=${hour}&date=${dateStr}`;
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
          <div className="bg-[#F5F0EB] rounded-2xl p-4 mb-4">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-3">Add Event / Block</p>
            <input
              autoFocus
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddEvent()}
              placeholder="Event name..."
              className="w-full rounded-xl border border-[#E8E4DF] bg-white px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10"
            />
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-[#8A8580]">Duration:</span>
              {[1, 2, 3].map((h) => (
                <button
                  key={h}
                  onClick={() => setEventDuration(h)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    eventDuration === h ? "bg-[#1A1A1A] text-white" : "bg-white border border-[#E8E4DF] text-[#4A5568]"
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddEvent(false)} className="flex-1 rounded-xl text-sm border-[#E8E4DF]">
                Cancel
              </Button>
              <Button
                onClick={handleAddEvent}
                disabled={!eventTitle.trim() || createEventMutation.isPending}
                className="flex-1 bg-[#1A1A1A] hover:bg-[#333] text-white rounded-xl text-sm"
              >
                {createEventMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
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

        {habit && (
          <div className={`rounded-2xl p-5 ${habit.status === "confirmed" || habit.status === "completed" ? "bg-[#7C9A82] text-white" : "bg-[#E8F0EA] text-[#1A1A1A]"}`}>
            <p className="text-lg font-bold mb-1">{habit.title}</p>
            {habit.description && <p className="text-sm opacity-80 mb-3">{habit.description}</p>}
            {habit.source && <p className="text-xs opacity-60 mb-4">From: {habit.source}</p>}
            <div className="flex gap-2 flex-wrap">
              {habit.status === "suggested" && (
                <Button onClick={() => onConfirm(habit)} className="bg-[#7C9A82] hover:bg-[#6B8A71] text-white rounded-xl">
                  <Check className="w-4 h-4 mr-2" /> Confirm
                </Button>
              )}
              {(habit.status === "confirmed" || habit.status === "suggested") && (
                <Button onClick={() => onComplete(habit)} variant="outline" className="rounded-xl border-current hover:bg-white/10">
                  Mark Complete
                </Button>
              )}
            </div>
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
              Ask Partner what to do here
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}