import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, subDays } from "date-fns";
import { X, Plus, Check, Loader2 } from "lucide-react";
import { areaOf, CATEGORY_EMOJI } from "@/lib/lifeAreas";
import { BUCKET_IDEAS } from "@/lib/bucketIdeas";
import BucketHabitRow from "./BucketHabitRow";

const commonest = (numbers) => {
  const counts = {};
  numbers.forEach((n) => { counts[n] = (counts[n] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? Number(top[0]) : 0;
};

export default function BucketSheet({ bucket, habits = [], settings, onClose }) {
  const queryClient = useQueryClient();
  const [added, setAdded] = useState([]);
  const [busy, setBusy] = useState(null);
  const cutoff = format(subDays(new Date(), 6), "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Same habit, many dates — collapsed into one row that says how often it repeats.
  const groups = useMemo(() => {
    const map = new Map();
    habits
      .filter((h) => areaOf(h, settings) === bucket.key)
      .forEach((h) => {
        const key = (h.title || "").trim().toLowerCase();
        const group = map.get(key) || {
          key,
          title: h.title,
          emoji: CATEGORY_EMOJI[h.category] || "✨",
          minutes: [],
          weekCount: 0,
          totalCount: 0,
          lastDate: null,
          area: areaOf(h, settings),
          ids: [],
        };
        group.ids.push(h.id);
        group.totalCount += 1;
        if (h.scheduled_date && h.scheduled_date >= cutoff && h.scheduled_date <= todayStr) group.weekCount += 1;
        if (h.scheduled_date && (!group.lastDate || h.scheduled_date > group.lastDate)) {
          group.lastDate = h.scheduled_date;
          group.emoji = h.emoji || CATEGORY_EMOJI[h.category] || "✨";
        }
        if (h.duration_minutes) group.minutes.push(h.duration_minutes);
        map.set(key, group);
      });

    return [...map.values()]
      .map((g) => ({ ...g, minutes: commonest(g.minutes) }))
      .sort((a, b) => b.weekCount - a.weekCount || b.totalCount - a.totalCount);
  }, [habits, bucket.key, cutoff, todayStr, settings]);

  const inBacklog = new Set(
    habits.filter((h) => h.status === "backlog").map((h) => (h.title || "").trim().toLowerCase())
  );
  const ideas = BUCKET_IDEAS[bucket.key] || [];

  const move = async (group, key) => {
    await base44.entities.HabitBlock.bulkUpdate(group.ids.map((id) => ({ id, life_area: key })));
    queryClient.invalidateQueries({ queryKey: ["habits"] });
  };

  const addIdea = async (idea) => {
    setBusy(idea.title);
    await base44.entities.HabitBlock.create({
      title: idea.title,
      category: idea.category,
      duration_minutes: idea.minutes,
      emoji: idea.emoji,
      life_area: bucket.key,
      status: "backlog",
    });
    setAdded((prev) => [...prev, idea.title]);
    setBusy(null);
    queryClient.invalidateQueries({ queryKey: ["habits"] });
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
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md p-6 max-h-[88vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{bucket.emoji}</span>
            <p className="font-bold text-[#1A1A1A] text-lg">{bucket.label}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB]">
            <X className="w-4 h-4 text-[#8A8580]" />
          </button>
        </div>
        <p className="text-xs text-[#8A8580] mb-4">
          {bucket.hours}h this week toward ~{bucket.target}h. Each habit shows once, however often it repeats.
        </p>
        {bucket.includes?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 -mt-2 mb-4">
            {bucket.includes.map((phrase) => (
              <span
                key={phrase}
                className="px-2 py-0.5 rounded-full text-[11px]"
                style={{ backgroundColor: bucket.tint, color: bucket.color }}
              >
                {phrase}
              </span>
            ))}
          </div>
        )}

        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#B0AAA4] mb-2">What's in here</p>
        {groups.length === 0 ? (
          <p className="text-[13px] text-[#B0AAA4] py-3">
            Nothing yet. Anything tagged {bucket.short.toLowerCase()} on your grid lands here.
          </p>
        ) : (
          <div className="space-y-1.5">
            {groups.slice(0, 8).map((group) => (
              <BucketHabitRow key={group.key} group={group} onMove={move} settings={settings} />
            ))}
            {groups.length > 8 && (
              <p className="text-[10px] text-[#B0AAA4] pt-0.5">+{groups.length - 8} more in this bucket</p>
            )}
          </div>
        )}

        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#B0AAA4] mt-5 mb-2">
          Add something to {bucket.short.toLowerCase()}
        </p>
        <div className="space-y-1.5">
          {ideas.map((idea) => {
            const done = added.includes(idea.title) || inBacklog.has(idea.title.toLowerCase());
            return (
              <button
                key={idea.title}
                onClick={() => !done && addIdea(idea)}
                disabled={done || busy === idea.title}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-colors ${
                  done
                    ? "border-[#E8F0EA] bg-[#F7FAF8]"
                    : "border-dashed border-[#E8E4DF] bg-white hover:border-[#7C9A82] hover:bg-[#F7FAF8]"
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: done ? "#7C9A82" : bucket.tint }}
                >
                  {done ? (
                    <Check className="w-3 h-3 text-white" />
                  ) : busy === idea.title ? (
                    <Loader2 className="w-3 h-3 text-[#8A8580] animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" style={{ color: bucket.color }} />
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[13px] leading-tight truncate ${done ? "text-[#8A8580]" : "text-[#1A1A1A]"}`}>
                    {idea.title}
                  </span>
                  <span className="block text-[10px] text-[#8A8580] leading-tight mt-0.5">
                    {done ? "In your backlog" : `${idea.minutes} min`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-[#B0AAA4] mt-3 leading-snug">
          Added ideas wait in your backlog until you give them an hour.
        </p>
      </motion.div>
    </motion.div>
  );
}