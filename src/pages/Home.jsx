import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays } from "date-fns";
import { createPageUrl } from "../utils";
import { ChevronLeft, ChevronRight, Calendar, MessageCircle, Plus, Sparkles } from "lucide-react";
import { addDays as addDaysFn, format as formatFn } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import DayGrid from "../components/grid/DayGrid";
import GridLegend from "../components/grid/GridLegend";
import SpareCounter from "../components/grid/SpareCounter";
import StatsRow from "../components/grid/StatsRow";
import HourDetailSheet from "../components/grid/HourDetailSheet";
import CalendarSync from "../components/calendar/CalendarSync";
import AddEventForm from "../components/grid/AddEventForm";
import GoalsOnboarding from "../components/onboarding/GoalsOnboarding";
import StatsDetailSheet from "../components/grid/StatsDetailSheet";

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(null);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showGoalsOnboarding, setShowGoalsOnboarding] = useState(false);
  const [statsSheet, setStatsSheet] = useState(null); // "completed" | "scheduled" | null
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
    initialData: [],
  });

  const { data: habits } = useQuery({
    queryKey: ["habits"],
    queryFn: () => base44.entities.HabitBlock.list(),
    initialData: [],
  });

  const profile = profiles[0];
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const parseSleepHours = () => {
    if (!profile) return [];
    const hours = [];
    // Simple parse: assume sleep from sleep_actual time to wake_time
    const sleepMatch = profile.sleep_actual?.match(/(\d+)/);
    const wakeMatch = profile.wake_time?.match(/(\d+)/);
    if (sleepMatch && wakeMatch) {
      let sleepH = parseInt(sleepMatch[1]);
      let wakeH = parseInt(wakeMatch[1]);
      if (profile.sleep_actual?.toLowerCase().includes("p") && sleepH !== 12) sleepH += 12;
      if (profile.sleep_actual?.toLowerCase().includes("a") && sleepH === 12) sleepH = 0;
      if (profile.wake_time?.toLowerCase().includes("p") && wakeH !== 12) wakeH += 12;
      if (profile.wake_time?.toLowerCase().includes("a") && wakeH === 12) wakeH = 0;
      
      if (sleepH > wakeH) {
        for (let i = sleepH; i < 24; i++) hours.push(i);
        for (let i = 0; i < wakeH; i++) hours.push(i);
      } else {
        for (let i = sleepH; i < wakeH; i++) hours.push(i);
      }
    }
    return hours;
  };

  const sleepHours = parseSleepHours();
  const unmovables = profile?.unmovables || [];
  const dayName = format(selectedDate, "EEEE").toLowerCase();
  const todayHabits = habits.filter(h => h.scheduled_date === dateStr && h.status !== "backlog");

  const getSpareCount = () => {
    let count = 0;
    for (let h = 0; h < 24; h++) {
      const isUnmovable = unmovables.some(
        u => u.start_hour <= h && u.end_hour > h && (u.days?.includes(dayName) || u.days?.length === 0)
      );
      const isHabit = todayHabits.some(hab => hab.scheduled_hour === h);
      const isSleep = sleepHours.includes(h);
      if (!isUnmovable && !isHabit && !isSleep) count++;
    }
    return count;
  };

  const completedCount = todayHabits.filter(h => h.status === "completed").length;

  // Show goals onboarding prompt once after main onboarding done
  useEffect(() => {
    if (profile && profile.onboarding_complete && !profile.goals_onboarding_complete && !showGoalsOnboarding) {
      const timer = setTimeout(() => setShowGoalsOnboarding(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  const updateHabitMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HabitBlock.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.HabitBlock.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });

  const DAY_MAP = { mon: "monday", tue: "tuesday", wed: "wednesday", thu: "thursday", fri: "friday", sat: "saturday", sun: "sunday" };
  const WEEKDAYS = ["monday","tuesday","wednesday","thursday","friday"];

  const getDatesToSchedule = (repeat, fromDate, fromDateStr) => {
    if (repeat === "none") return [fromDateStr];
    const dates = [];
    for (let i = 0; i < 60; i++) {
      const d = addDaysFn(fromDate, i);
      const dayName = formatFn(d, "EEEE").toLowerCase();
      const dStr = formatFn(d, "yyyy-MM-dd");
      if (repeat === "daily") dates.push(dStr);
      else if (repeat === "weekdays" && WEEKDAYS.includes(dayName)) dates.push(dStr);
      else if (repeat === "weekly" && i % 7 === 0) dates.push(dStr);
      else if (DAY_MAP[repeat] === dayName) dates.push(dStr);
    }
    return dates;
  };

  const handleSaveNewEvent = async ({ title, duration, category, energy, repeat }) => {
    const fromDateStr = format(selectedDate, "yyyy-MM-dd");
    const dates = getDatesToSchedule(repeat, selectedDate, fromDateStr);
    // Default to next available spare hour
    let targetHour = new Date().getHours();
    while (targetHour < 23 && (
      unmovables.some(u => u.start_hour <= targetHour && u.end_hour > targetHour) ||
      sleepHours.includes(targetHour) ||
      todayHabits.some(h => h.scheduled_hour === targetHour)
    )) targetHour++;

    await Promise.all(dates.map(d =>
      createEventMutation.mutateAsync({
        title, status: "confirmed",
        scheduled_date: d,
        scheduled_hour: targetHour,
        duration_minutes: duration,
        category, energy_level: energy,
      })
    ));
    setShowAddEvent(false);
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Your Grid</h1>
              <p className="text-sm text-[#8A8580]">Map your day, find your growth</p>
            </div>
            <button
              onClick={() => setShowAddEvent(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333] transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Event
            </button>
          </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-[#E8E4DF] mb-4">
        <button
          onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          className="p-2 rounded-xl hover:bg-[#F5F0EB] transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[#4A5568]" />
        </button>
        <div className="text-center">
          <p className="text-lg font-semibold text-[#1A1A1A]">{format(selectedDate, "EEEE")}</p>
          <p className="text-xs text-[#8A8580]">{format(selectedDate, "MMMM d, yyyy")}</p>
        </div>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="p-2 rounded-xl hover:bg-[#F5F0EB] transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-[#4A5568]" />
        </button>
      </div>

      {/* Spare / Calendar / Partner row */}
          <div className="flex items-center gap-2 mb-4">
            <SpareCounter count={getSpareCount()} />
            <button
              onClick={() => setShowCalendarSync(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E8E4DF] text-[#8A8580] text-xs font-medium hover:bg-[#F5F0EB] transition-colors whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5" /> Sync
            </button>
            <button
              onClick={() => window.location.href = createPageUrl("Partner") + "?context=grid"}
              className="flex-1 flex items-center justify-between bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] hover:from-[#333] hover:to-[#444] text-white rounded-xl px-4 py-1.5 transition-all group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#D4A574]" />
                <span className="text-xs font-semibold">Ask {profile?.partner_name || "Partner"}</span>
              </div>
              <MessageCircle className="w-3.5 h-3.5 text-white/50 group-hover:text-white transition-colors" />
            </button>
          </div>

          {/* Stats */}
          <div className="mb-4">
            <StatsRow
              completed={completedCount}
              total={todayHabits.length}
              streak={3}
              onClickCompleted={() => setStatsSheet("completed")}
              onClickScheduled={() => setStatsSheet("scheduled")}
            />
          </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl p-4 border border-[#E8E4DF] mb-4">
        <DayGrid
          date={selectedDate}
          unmovables={unmovables}
          habits={habits}
          sleepHours={sleepHours}
          onSquareClick={(hour) => setSelectedHour(hour)}
        />
      </div>

      <GridLegend />

      {/* Global Add Event Modal */}
          <AnimatePresence>
            {showAddEvent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center"
                onClick={() => setShowAddEvent(false)}
              >
                <motion.div
                  initial={{ y: 80 }}
                  animate={{ y: 0 }}
                  exit={{ y: 80 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-bold text-[#1A1A1A] text-lg">Add Event</p>
                    <button onClick={() => setShowAddEvent(false)} className="p-2 rounded-xl hover:bg-[#F5F0EB]">
                      <Plus className="w-5 h-5 text-[#8A8580] rotate-45" />
                    </button>
                  </div>
                  <AddEventForm
                    onSave={handleSaveNewEvent}
                    onCancel={() => setShowAddEvent(false)}
                    isPending={createEventMutation.isPending}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

      {/* Calendar Sync */}
      <AnimatePresence>
        {showCalendarSync && (
          <CalendarSync onClose={() => setShowCalendarSync(false)} />
        )}
      </AnimatePresence>

      {/* Hour Detail Sheet */}
      <AnimatePresence>
        {selectedHour !== null && (
          <HourDetailSheet
            hour={selectedHour}
            date={selectedDate}
            habits={habits}
            unmovables={unmovables}
            sleepHours={sleepHours}
            profile={profile}
            onClose={() => setSelectedHour(null)}
            onConfirm={(habit) => {
              updateHabitMutation.mutate({ id: habit.id, data: { status: "confirmed" } });
            }}
            onComplete={(habit) => {
              updateHabitMutation.mutate({ id: habit.id, data: { status: "completed" } });
            }}
          />
        )}
      </AnimatePresence>

      {/* Stats Detail Sheet */}
      <AnimatePresence>
        {statsSheet && (
          <StatsDetailSheet
            type={statsSheet}
            habits={todayHabits}
            date={selectedDate}
            onClose={() => setStatsSheet(null)}
          />
        )}
      </AnimatePresence>

      {/* Goals Onboarding prompt */}
      <AnimatePresence>
        {showGoalsOnboarding && profile && (
          <GoalsOnboarding
            profile={profile}
            onClose={() => setShowGoalsOnboarding(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}