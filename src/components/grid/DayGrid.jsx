import React from "react";
import HourSquare from "./HourSquare";
import { format } from "date-fns";

export default function DayGrid({ date, unmovables, habits, sleepHours, onSquareClick }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayName = format(date, "EEEE").toLowerCase();

  const getUnmovableForHour = (hour) => {
    return unmovables?.find(
      (u) => u.start_hour <= hour && u.end_hour > hour && (u.days?.includes(dayName) || u.days?.length === 0)
    );
  };

  const getHabitForHour = (hour) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return habits?.find(
      (h) => h.scheduled_hour === hour && h.scheduled_date === dateStr && h.status !== "backlog"
    );
  };

  const isSleepHour = (hour) => {
    if (!sleepHours) return false;
    return sleepHours.includes(hour);
  };

  const isSpareHour = (hour) => {
    return !getUnmovableForHour(hour) && !getHabitForHour(hour) && !isSleepHour(hour);
  };

  return (
    <div className="grid grid-cols-6 gap-2">
      {hours.map((hour) => (
        <HourSquare
          key={hour}
          hour={hour}
          unmovable={getUnmovableForHour(hour)}
          habit={getHabitForHour(hour)}
          isSpare={isSpareHour(hour)}
          isSleep={isSleepHour(hour)}
          onSquareClick={onSquareClick}
        />
      ))}
    </div>
  );
}