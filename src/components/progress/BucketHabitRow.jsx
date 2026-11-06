import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { RotateCcw } from "lucide-react";
import { LIFE_AREAS, areaMeta } from "@/lib/lifeAreas";

// One habit, once — however many times it repeats. Opening the row is how you
// move the whole thing to another bucket.
export default function BucketHabitRow({ group, onMove, settings }) {
  const [open, setOpen] = useState(false);
  // Their own bucket names and emoji, so moving something reads in their language.
  const buckets = settings?.length ? settings : LIFE_AREAS;
  const area = buckets.find((option) => option.key === group.area) || areaMeta(group.area);
  const repeats = group.totalCount > 1;

  const meta = [];
  if (group.weekCount > 1) meta.push(`${group.weekCount}× this week`);
  else if (repeats) meta.push("repeats");
  if (group.minutes) meta.push(`${group.minutes}m`);
  if (!repeats && group.lastDate) meta.push(format(new Date(`${group.lastDate}T12:00:00`), "MMM d"));

  return (
    <div className="rounded-xl border border-[#E8E4DF] overflow-hidden bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#FAF8F5] transition-colors text-left"
      >
        <span
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[12px] flex-shrink-0"
          style={{ backgroundColor: area.tint }}
        >
          {group.emoji}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-medium text-[#1A1A1A] leading-tight truncate">{group.title}</span>
          <span className="block text-[10px] text-[#8A8580] leading-tight mt-0.5">{meta.join(" · ")}</span>
        </span>
        {repeats && <RotateCcw className="w-3 h-3 text-[#B0AAA4] flex-shrink-0" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2.5 flex items-center gap-1">
              <span className="text-[9px] text-[#B0AAA4] mr-1">Move to</span>
              {buckets.map((option) => {
                const active = option.key === group.area;
                return (
                  <button
                    key={option.key}
                    onClick={() => !active && onMove(group, option.key)}
                    title={option.label}
                    className={`h-7 w-7 rounded-lg text-[12px] flex items-center justify-center border transition-colors ${
                      active ? "border-transparent" : "border-[#E8E4DF] bg-white hover:bg-[#F5F0EB]"
                    }`}
                    style={active ? { backgroundColor: option.color } : undefined}
                  >
                    {option.emoji}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}