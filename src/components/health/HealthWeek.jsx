import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/lib/useCurrentUser";

const asHours = (minutes) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

export default function HealthWeek() {
  const currentUser = useCurrentUser();
  const startDate = format(subDays(new Date(), 6), "yyyy-MM-dd");

  const { data: snapshots = [] } = useQuery({
    queryKey: ["healthSnapshots", currentUser?.id, startDate],
    queryFn: async () => {
      const page = await base44.entities.HealthSnapshot.filter(
        { user_id: currentUser.id, date: { $gte: startDate } },
        { sort: "-date", limit: 14 }
      );
      return page?.items || [];
    },
    enabled: !!currentUser,
  });

  if (!snapshots.length) return null;

  const lastNight = snapshots[0];
  const nights = snapshots.filter((s) => typeof s.sleep_minutes === "number").slice(0, 7);
  const avgSleep = nights.length
    ? Math.round(nights.reduce((sum, s) => sum + s.sleep_minutes, 0) / nights.length)
    : 0;
  const peak = Math.max(...nights.map((s) => s.sleep_minutes), 1);

  const tiles = [
    { label: "Last night", value: typeof lastNight.sleep_minutes === "number" ? asHours(lastNight.sleep_minutes) : "—" },
    { label: "7-night avg", value: avgSleep ? asHours(avgSleep) : "—" },
    // Fitbit reports no readiness score — show its sleep efficiency instead.
    lastNight.readiness_score != null
      ? { label: "Readiness", value: lastNight.readiness_score }
      : { label: "Efficiency", value: lastNight.efficiency != null ? `${lastNight.efficiency}%` : "—" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 border border-[#E8E4DF] mb-6"
    >
      <p className="font-semibold text-[#1A1A1A] text-sm mb-4">Your last 7 nights</p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-[#FAF8F5] rounded-xl px-2 py-3 text-center">
            <p className="text-base font-bold text-[#1A1A1A] leading-tight">{tile.value}</p>
            <p className="text-[10px] text-[#8A8580] font-medium mt-0.5">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-end gap-1.5 h-20">
        {[...nights].reverse().map((night) => (
          <div key={night.id} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
            <div
              className="w-full rounded-t-md bg-[#7C9A82]"
              style={{ height: `${Math.max(6, (night.sleep_minutes / peak) * 100)}%` }}
              title={`${asHours(night.sleep_minutes)} on ${format(new Date(`${night.date}T12:00:00`), "MMM d")}`}
            />
            <span className="text-[9px] text-[#B0AAA4]">
              {format(new Date(`${night.date}T12:00:00`), "EEEEE")}
            </span>
          </div>
        ))}
      </div>

      {(lastNight.steps || lastNight.activity_score) && (
        <p className="text-[11px] text-[#8A8580] mt-3">
          {lastNight.steps ? `${lastNight.steps.toLocaleString()} steps` : ""}
          {lastNight.steps && lastNight.activity_score ? " · " : ""}
          {lastNight.activity_score ? `activity score ${lastNight.activity_score}` : ""}
        </p>
      )}
    </motion.div>
  );
}