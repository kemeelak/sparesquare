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
      className="relative bg-[#4A5568] rounded-2xl p-4 mb-4 text-white overflow-hidden"
    >
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1.5 rounded-lg text-white/60 hover:bg-white/10"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <p className="text-xs font-medium text-white/75">
        {mode.emoji} You're commuting · {minutesLeft} min left
      </p>
      <p className="text-sm font-semibold mt-1 pr-6">This ride can hold something.</p>
      <button
        onClick={onOpen}
        className="mt-3 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#1A1A1A] text-xs font-semibold"
      >
        See ideas <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}