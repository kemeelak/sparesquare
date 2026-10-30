import React from "react";
import { motion } from "framer-motion";
import { MOODS } from "@/lib/mood";

export default function MoodPopup({ slot, mood, onSelect, onSkip, isSaving }) {
  const isEvening = slot === "evening";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center"
      onClick={onSkip}
    >
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md p-5 pb-8 lg:pb-5"
      >
        <p className="text-lg font-bold text-[#1A1A1A]">
          {isEvening ? "How did today land?" : "Where are you at today?"}
        </p>
        <p className="text-xs text-[#8A8580] mt-1">
          {isEvening
            ? "One tap — it shapes tomorrow's ideas."
            : "One tap — it shapes what we suggest today."}
        </p>

        <div className="grid grid-cols-5 gap-1.5 mt-4">
          {MOODS.map((m) => {
            const active = mood?.score === m.score;
            return (
              <button
                key={m.score}
                disabled={isSaving}
                onClick={() => onSelect(m)}
                className={`flex flex-col items-center gap-1 py-3 rounded-2xl border transition-colors ${
                  active
                    ? "bg-[#1A1A1A] border-[#1A1A1A]"
                    : "bg-white border-[#E8E4DF] hover:bg-[#F5F0EB]"
                }`}
              >
                <span className="text-xl leading-none">{m.emoji}</span>
                <span
                  className={`text-[10px] font-medium ${
                    active ? "text-white" : "text-[#4A5568]"
                  }`}
                >
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onSkip}
          className="w-full mt-3 py-2 text-xs font-medium text-[#8A8580]"
        >
          Skip for now
        </button>
      </motion.div>
    </motion.div>
  );
}