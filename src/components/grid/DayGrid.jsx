import React from "react";
import HourSquare from "./HourSquare";
import { format } from "date-fns";
import { commuteMode, windowsForDay, windowForHour } from "@/lib/commute";

export default function DayGrid({ date, unmovables, habits, sleepHours, calendarBlocks = [], commute, sessions = [], onSquareClick }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayName = format(date, "EEEE").toLowerCase();

  const getCalendarForHour = (hour) =>
    calendarBlocks.filter((b) => b.start_hour <= hour && b.end_hour > hour);

  const getUnmovableForHour = (hour) => {
    const calendar = getCalendarForHour(hour);
    if (calendar.length > 0) return calendar[0];
    return unmovables?.find(
      (u) => u.start_hour <= hour && u.end_hour > hour && (u.days?.includes(dayName) || u.days?.length === 0)
    );
  };

  const getHabitsForHour = (hour) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return habits?.filter(
      (h) => h.scheduled_hour === hour && h.scheduled_date === dateStr && h.status !== "backlog"
    ) || [];
  };

  const isSleepHour = (hour) => {
    if (!sleepHours) return false;
    return sleepHours.includes(hour);
  };

  const rideWindows = windowsForDay(commute, sessions, date);
  const rideWindowAt = (hour) => windowForHour(rideWindows, hour);
  const isCommuteHour = (hour) => !!rideWindowAt(hour);

  const commuteEmoji = (hour) =>
    rideWindowAt(hour)?.mode?.emoji || (commute?.enabled ? commuteMode(commute).emoji : "🚗");
  const isCalendarHour = (hour) => getCalendarForHour(hour).length > 0;

  const isSpareHour = (hour) => {
    return (
      !getUnmovableForHour(hour) &&
      !getHabitsForHour(hour).length &&
      !isSleepHour(hour) &&
      !isCommuteHour(hour)
    );
  };

  return (
    <div className="grid grid-cols-6 gap-2">
      {hours.map((hour) => {
        const habitsForHour = getHabitsForHour(hour);
        const calendarForHour = getCalendarForHour(hour);
        return (
          <HourSquare
            key={hour}
            hour={hour}
            unmovable={getUnmovableForHour(hour)}
            habit={habitsForHour[0] || null}
            habits={habitsForHour}
            calendarEventCount={calendarForHour.length}
            isSpare={isSpareHour(hour)}
            isSleep={isSleepHour(hour)}
            isCommute={isCommuteHour(hour)}
            commuteEmoji={commuteEmoji(hour)}
            isCalendarUnmovable={isCalendarHour(hour)}
            onSquareClick={onSquareClick}
          />
        );
      })}
    </div>
  );
}