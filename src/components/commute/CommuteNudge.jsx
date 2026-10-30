import React from "react";
import { motion } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { commuteMode } from "@/lib/commute";

export default function CommuteNudge({ commute, minutesLeft, onOpen, onDismiss }) {
  const mode = commuteMode(commute);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 bg-[#4A5568] rounded-xl pl-3 pr-1.5 py-1.5 mb-2 text-white"
    >
      <span className="text-sm flex-shrink-0">{mode.emoji}</span>
      <button
        onClick={onOpen}
        className="min-w-0 flex-1 flex items-center justify-between gap-2 text-left"
      >
        <span className="text-xs font-medium truncate">
          You're commuting · {minutesLeft} min left
        </span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-white/80 flex-shrink-0">
          Ideas <ArrowRight className="w-3 h-3" />
        </span>
      </button>
      <button
        onClick={onDismiss}
        className="p-1 rounded-md text-white/60 hover:bg-white/10 flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}