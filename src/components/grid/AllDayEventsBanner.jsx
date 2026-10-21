import React from "react";
import { motion } from "framer-motion";

export default function AllDayEventsBanner({ events = [] }) {
  if (!events.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 flex items-center gap-2"
    >
      <span className="text-[10px] font-semibold text-[#8A8580] uppercase tracking-wide flex-shrink-0">All day</span>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="flex items-center gap-1.5 bg-[#4A5568] text-white rounded-full px-3 py-1.5 flex-shrink-0"
          >
            <span className="text-xs">📅</span>
            <span className="text-xs font-medium truncate max-w-[160px]">{ev.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}