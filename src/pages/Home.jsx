import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays, format as formatFn, addDays as addDaysFn } from "date-fns";
import { createPageUrl } from "../utils";
import { ChevronLeft, ChevronRight, Calendar, MessageCircle, Plus, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DayGrid from "../components/grid/DayGrid";
import GridLegend from "../components/grid/GridLegend";
import SpareCounter from "../components/grid/SpareCounter";
import StatsRow from "../components/grid/StatsRow";
import HourDetailSheet from "../components/grid/HourDetailSheet";
import CalendarSync from "../components/calendar/CalendarSync";
import AllDayEventsBanner from "../components/grid/AllDayEventsBanner";
import AddEventForm from "../components/grid/AddEventForm";
import GoalsOnboarding from "../components/onboarding/GoalsOnboarding";
import FeatureTour from "../components/onboarding/FeatureTour";
import StatsDetailSheet from "../components/grid/StatsDetailSheet";
import CommuteSetup from "../components/commute/CommuteSetup";
import CommuteSheet from "../components/commute/CommuteSheet";
import CommuteOptIn from "../components/commute/CommuteOptIn";
import CommuteNudge from "../components/commute/CommuteNudge";
import StartCommuteSheet from "../components/commute/StartCommuteSheet";
import MoodPopup from "../components/mood/MoodPopup";
import { getCommute, windowsForDay, windowForHour, minutesLeftInWindow, elapsedMinutes, trimWindowsToCalendar } from "../lib/commute";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function Home() {
  const currentUser = useCurrentUser();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(null);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showGoalsOnboarding, setShowGoalsOnboarding] = useState(false);
  const [statsSheet, setStatsSheet] = useState(null); // "completed" | "scheduled" | null
  const [showCommuteSetup, setShowCommuteSetup] = useState(false);
  const [showStartCommute, setShowStartCommute] = useState(false);
  const [rideSheet, setRideSheet] = useState(null); // { hour, window }
  const [startedRides, setStartedRides] = useState([]);
  const [commuteOptInHidden, setCommuteOptInHidden] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [moodPopup, setMoodPopup] = useState(null); // "morning" | "evening" | null
  const [moodPrompted, setMoodPrompted] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [tourChecked, setTourChecked] = useState(false);
  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.filter({ created_by_id: currentUser.id }),
    enabled: !!currentUser,
  });

  const { data: habits } = useQuery({
    queryKey: ["habits"],
    queryFn: () => base44.entities.HabitBlock.filter({ created_by_id: currentUser.id }),
    initialData: [],
    enabled: !!currentUser,
  });

  const { data: rides = [] } = useQuery({
    queryKey: ["commuteSessions"],
    queryFn: async () => {
      const page = await base44.entities.CommuteSession.filter(
        { created_by_id: currentUser.id },
        { sort: "-start_time", limit: 40 }
      );
      return page?.items || [];
    },
    enabled: !!currentUser,
  });

  const profile = profiles[0];
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: calendarRes, isError: calendarError, refetch: refetchCalendar } = useQuery({
    queryKey: ["calendarEvents", dateStr],
    queryFn: () => base44.functions.invoke('getCalendarEvents', { date: dateStr }),
    enabled: !!currentUser,
    retry: false,
  });
  const calendarBlocks = calendarRes?.data?.blocks || [];
  const allDayEvents = calendarBlocks.filter((b) => b.all_day);
  const timedCalendarBlocks = calendarBlocks.filter((b) => !b.all_day);
  const calendarConnected = !calendarError && !!calendarRes?.data;
  const googleConnected = !!calendarRes?.data?.google_connected;

  const { data: moods = [] } = useQuery({
    queryKey: ["mood", dateStr],
    queryFn: () => base44.entities.MoodCheckin.filter({ created_by_id: currentUser.id, date: dateStr }),
    enabled: !!currentUser,
  });
  const morningMood = moods.find((m) => m.slot === "morning" || !m.slot) || null;
  const eveningMood = moods.find((m) => m.slot === "evening") || null;
  const mood = eveningMood || morningMood;

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

  const commute = getCommute(profile);
  const now = new Date();
  const isToday = format(selectedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");

  // Every ride on this day: saved morning/evening windows plus rides started on the spot
  const rideMap = new Map();
  [...rides, ...startedRides].forEach((ride) => ride?.id && rideMap.set(ride.id, ride));
  const dayRides = [...rideMap.values()];
  // Saved windows give way to whatever the calendar already has booked
  const rideWindows = trimWindowsToCalendar(
    windowsForDay(commute, dayRides, selectedDate),
    timedCalendarBlocks
  );
  const windowAt = (hour) => windowForHour(rideWindows, hour);
  const liveWindow = isToday ? windowAt(now.getHours()) : null;
  const liveMinutesLeft = liveWindow ? minutesLeftInWindow(liveWindow, now.getHours()) : 0;

  const getSpareCount = () => {
    let count = 0;
    for (let h = 0; h < 24; h++) {
      const isUnmovable = unmovables.some(
        u => u.start_hour <= h && u.end_hour > h && (u.days?.includes(dayName) || u.days?.length === 0)
      );
      const isCalendar = timedCalendarBlocks.some(b => b.start_hour <= h && b.end_hour > h);
      const isHabit = todayHabits.some(hab => hab.scheduled_hour === h);
      const isSleep = sleepHours.includes(h);
      const onCommute = !!windowAt(h);
      if (!isUnmovable && !isCalendar && !isHabit && !isSleep && !onCommute) count++;
    }
    return count;
  };

  const completedCount = todayHabits.filter(h => h.status === "completed").length;

  // A new member gets shown around before anything else asks for their attention
  useEffect(() => {
    if (!profile || tourChecked) return;
    setTourChecked(true);
    if (profile.onboarding_complete && !profile.tour_complete) setShowTour(true);
  }, [profile, tourChecked]);

  const finishTour = async () => {
    setShowTour(false);
    if (!profile) return;
    await base44.entities.UserProfile.update(profile.id, { tour_complete: true });
    queryClient.invalidateQueries({ queryKey: ["userProfile"] });
  };

  // Show goals onboarding prompt once after main onboarding done
  useEffect(() => {
    if (profile && profile.onboarding_complete && profile.tour_complete && !profile.goals_onboarding_complete && !showGoalsOnboarding) {
      const timer = setTimeout(() => setShowGoalsOnboarding(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  // The check-in lives in a pop-up — morning window and evening window
  const moodSlot =
    now.getHours() >= 5 && now.getHours() < 11
      ? "morning"
      : now.getHours() >= 18 && now.getHours() < 23
      ? "evening"
      : null;

  // A sheet the user opened takes priority — never pop the check-in on top of it
  const sheetOpen =
    showCalendarSync || showAddEvent || selectedHour !== null || !!rideSheet ||
    showCommuteSetup || showStartCommute || !!statsSheet || showGoalsOnboarding || showTour;

  useEffect(() => {
    if (moodPrompted || !isToday || !moodSlot || !currentUser || sheetOpen) return;
    if (moodSlot === "morning" ? morningMood : eveningMood) return;
    const timer = setTimeout(() => {
      setMoodPopup(moodSlot);
      setMoodPrompted(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [moodPrompted, isToday, moodSlot, morningMood, eveningMood, currentUser, sheetOpen]);

  const updateHabitMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HabitBlock.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.HabitBlock.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });

  const saveCommuteMutation = useMutation({
    mutationFn: (commuteData) => base44.entities.UserProfile.update(profile.id, { commute: commuteData }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
  });

  const saveMoodMutation = useMutation({
    mutationFn: ({ score, label, slot }) => {
      const existing = slot === "evening" ? eveningMood : morningMood;
      return existing
        ? base44.entities.MoodCheckin.update(existing.id, { score, label, slot })
        : base44.entities.MoodCheckin.create({ date: dateStr, score, label, slot });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mood", dateStr] }),
  });

  const startRideMutation = useMutation({
    mutationFn: ({ minutes, mode }) =>
      base44.entities.CommuteSession.create({
        start_time: new Date().toISOString(),
        duration_minutes: minutes,
        mode,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["commuteSessions"] }),
  });

  const endRideMutation = useMutation({
    mutationFn: (session) =>
      base44.entities.CommuteSession.update(session.id, { duration_minutes: elapsedMinutes(session) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["commuteSessions"] }),
  });

  const DAY_MAP = { mon: "monday", tue: "tuesday", wed: "wednesday", thu: "thursday", fri: "friday", sat: "saturday", sun: "sunday" };
  const WEEKDAYS = ["monday","tuesday","wednesday","thursday","friday"];

  const getDatesToSchedule = (repeat, fromDate, fromDateStr) => {
    if (repeat === "none" || !repeat) return [fromDateStr];
    // Array of specific days e.g. ["mon","thu"]
    if (Array.isArray(repeat)) {
      const dates = [];
      for (let i = 0; i < 60; i++) {
        const d = addDaysFn(fromDate, i);
        const dayName = formatFn(d, "EEEE").toLowerCase();
        const dStr = formatFn(d, "yyyy-MM-dd");
        if (repeat.some(r => DAY_MAP[r] === dayName)) dates.push(dStr);
      }
      return dates;
    }
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
    // repeat may be an array of specific days
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

  // One ride, one line: while the live commute bar is showing, the generic ride button steps aside.
  const showCommuteNudge = !!(commute && liveWindow && !liveWindow.oneOff && !nudgeDismissed);

  return (
    <div className="p-3 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-[#1A1A1A] tracking-tight leading-tight">Your Grid</h1>
              <p className="text-[11px] text-[#8A8580]">Map your day, find your growth</p>
            </div>
            <button
              onClick={() => setShowAddEvent(true)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#1A1A1A] text-white text-xs font-medium hover:bg-[#333] transition-colors flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-white rounded-xl px-1 py-1 border border-[#E8E4DF] mb-2.5">
        <button
          onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          className="p-1.5 rounded-lg hover:bg-[#F5F0EB] transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-[#4A5568]" />
        </button>
        <div className="text-center leading-tight">
          <p className="text-sm font-semibold text-[#1A1A1A]">{format(selectedDate, "EEEE")}</p>
          <p className="text-[10px] text-[#8A8580]">{format(selectedDate, "MMMM d")}</p>
        </div>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="p-1.5 rounded-lg hover:bg-[#F5F0EB] transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-[#4A5568]" />
        </button>
      </div>

      {/* Spare / Calendar / Partner row */}
          <div className="flex items-center gap-2 mb-2.5">
            <SpareCounter count={getSpareCount()} />
            <button
              onClick={() => { refetchCalendar(); setShowCalendarSync(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E8E4DF] text-[#8A8580] text-xs font-medium hover:bg-[#F5F0EB] transition-colors whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5" /> Sync
              {calendarConnected && <span className="w-1.5 h-1.5 rounded-full bg-[#7C9A82]" />}
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
          <div className="mb-2.5">
            <StatsRow
              completed={completedCount}
              total={todayHabits.length}
              streak={3}
              mood={mood}
              onClickCompleted={() => setStatsSheet("completed")}
              onClickScheduled={() => setStatsSheet("scheduled")}
              onClickMood={() => setMoodPopup(moodSlot || "morning")}
            />
          </div>

      {/* Commute */}
      {commute ? (
        showCommuteNudge && (
          <CommuteNudge
            commute={commute}
            minutesLeft={liveMinutesLeft}
            onOpen={() => setRideSheet({ hour: now.getHours(), window: liveWindow })}
            onDismiss={() => setNudgeDismissed(true)}
          />
        )
      ) : (
        !commuteOptInHidden &&
        profile?.onboarding_complete && (
          <CommuteOptIn
            onSetUp={() => setShowCommuteSetup(true)}
            onDismiss={() => setCommuteOptInHidden(true)}
          />
        )
      )}

      {/* Ride now — any time, any length */}
      {!showCommuteNudge && (
      <button
        onClick={() => {
          if (liveWindow) setRideSheet({ hour: now.getHours(), window: liveWindow });
          else setShowStartCommute(true);
        }}
        className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 mb-2 border transition-colors ${
          liveWindow
            ? "bg-[#4A5568] border-[#4A5568] text-white"
            : "bg-white border-[#E8E4DF] text-[#1A1A1A] hover:bg-[#F5F0EB]"
        }`}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-base">{liveWindow ? liveWindow.mode.emoji : "🧭"}</span>
          {liveWindow ? `${liveWindow.label} · ${liveMinutesLeft} min left` : "Start a commute"}
        </span>
        <span className={`text-xs ${liveWindow ? "text-white/70" : "text-[#8A8580]"}`}>
          {liveWindow ? "Open ride" : "Whenever you leave"}
        </span>
      </button>
      )}

      {/* All-day events banner */}
      <AllDayEventsBanner events={allDayEvents} />

      {/* Grid */}
      <div className="bg-white rounded-2xl p-3 border border-[#E8E4DF] mb-2">
        <DayGrid
          date={selectedDate}
          unmovables={unmovables}
          habits={habits}
          sleepHours={sleepHours}
          calendarBlocks={timedCalendarBlocks}
          commute={commute}
          sessions={dayRides}
          onSquareClick={(hour) => {
            const ride = windowAt(hour);
            if (ride) setRideSheet({ hour, window: ride });
            else setSelectedHour(hour);
          }}
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
          <CalendarSync
            onClose={() => setShowCalendarSync(false)}
            connected={googleConnected}
            onRefresh={refetchCalendar}
            blockCount={calendarBlocks.length}
            icsUrl={profile?.calendar_feed_url || ""}
          />
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
            calendarBlocks={timedCalendarBlocks}
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

      {/* Commute setup */}
      <AnimatePresence>
        {showCommuteSetup && profile && (
          <CommuteSetup
            profile={profile}
            isSaving={saveCommuteMutation.isPending}
            onClose={() => setShowCommuteSetup(false)}
            onSave={async (commuteData) => {
              await saveCommuteMutation.mutateAsync(commuteData);
              setShowCommuteSetup(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Ride sheet — saved windows and rides started on the spot */}
      <AnimatePresence>
        {rideSheet && (
          <CommuteSheet
            commute={commute}
            rideWindow={rideSheet.window}
            date={selectedDate}
            hour={rideSheet.hour}
            profile={profile}
            habits={habits}
            mood={mood}
            onEndRide={
              rideSheet.window?.session
                ? async () => {
                    const updated = await endRideMutation.mutateAsync(rideSheet.window.session);
                    if (updated?.id) {
                      setStartedRides((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                    }
                    setRideSheet(null);
                  }
                : null
            }
            onClose={() => setRideSheet(null)}
            onEdit={() => {
              setRideSheet(null);
              setShowCommuteSetup(true);
            }}
            onQueue={(item) =>
              createEventMutation.mutate({
                title: item.title,
                status: "confirmed",
                scheduled_date: dateStr,
                scheduled_hour: rideSheet.hour,
                duration_minutes: item.minutes,
                category: item.category,
                emoji: item.emoji,
              })
            }
            onQueueBacklog={(habit) =>
              updateHabitMutation.mutate({
                id: habit.id,
                data: {
                  status: "confirmed",
                  scheduled_date: dateStr,
                  scheduled_hour: rideSheet.hour,
                },
              })
            }
            onComplete={(habit) =>
              updateHabitMutation.mutate({ id: habit.id, data: { status: "completed" } })
            }
          />
        )}
      </AnimatePresence>

      {/* Start a ride on the spot */}
      <AnimatePresence>
        {showStartCommute && (
          <StartCommuteSheet
            defaultMode={commute?.mode || "transit"}
            isStarting={startRideMutation.isPending}
            onClose={() => setShowStartCommute(false)}
            onStart={async ({ minutes, mode }) => {
              const ride = await startRideMutation.mutateAsync({ minutes, mode });
              setStartedRides((prev) => [...prev, ride]);
              setShowStartCommute(false);
              const hour = new Date().getHours();
              setRideSheet({
                hour,
                window: windowForHour(windowsForDay(commute, [ride], selectedDate), hour),
              });
            }}
          />
        )}
      </AnimatePresence>

      {/* Morning / evening check-in pop-up */}
      <AnimatePresence>
        {moodPopup && (
          <MoodPopup
            slot={moodPopup}
            mood={moodPopup === "morning" ? morningMood : eveningMood}
            isSaving={saveMoodMutation.isPending}
            onSelect={(m) => {
              saveMoodMutation.mutate({ ...m, slot: moodPopup });
              setMoodPopup(null);
            }}
            onSkip={() => setMoodPopup(null)}
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

      {/* What this app can do for them, once */}
      <AnimatePresence>
        {showTour && <FeatureTour onDone={finishTour} />}
      </AnimatePresence>
    </div>
  );
}