import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays } from "date-fns";
import { createPageUrl } from "../utils";
import { ChevronLeft, ChevronRight, Calendar, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DayGrid from "../components/grid/DayGrid";
import GridLegend from "../components/grid/GridLegend";
import SpareCounter from "../components/grid/SpareCounter";
import StatsRow from "../components/grid/StatsRow";
import HourDetailSheet from "../components/grid/HourDetailSheet";
import CalendarSync from "../components/calendar/CalendarSync";

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(null);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
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

  const updateHabitMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HabitBlock.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Your Grid</h1>
          <p className="text-sm text-[#8A8580]">Map your day, find your growth</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCalendarSync(true)}
            className="p-2.5 rounded-xl bg-white border border-[#E8E4DF] text-[#8A8580] hover:bg-[#F5F0EB] transition-colors"
            title="Sync Calendar"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <SpareCounter count={getSpareCount()} />
        </div>
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

      {/* Stats */}
      <div className="mb-4">
        <StatsRow completed={completedCount} total={todayHabits.length} streak={3} />
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

      {/* Talk to Partner CTA */}
      <div className="mt-4 mb-2">
        <button
          onClick={() => window.location.href = createPageUrl("Partner") + "?context=grid"}
          className="w-full flex items-center justify-between bg-[#1A1A1A] hover:bg-[#333] text-white rounded-2xl px-5 py-4 transition-colors group"
        >
          <div className="text-left">
            <p className="font-semibold text-sm">Tell your Partner more about your life</p>
            <p className="text-xs text-white/60 mt-0.5">Share your goals, constraints & what you want to work on</p>
          </div>
          <MessageCircle className="w-5 h-5 text-white/60 group-hover:text-white flex-shrink-0 ml-3" />
        </button>
      </div>

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
    </div>
  );
}