import React from "react";
import { motion } from "framer-motion";
import { Car, X } from "lucide-react";

export default function CommuteOptIn({ onSetUp, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-white rounded-2xl border border-[#E8E4DF] p-4 mb-4 overflow-hidden"
    >
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1.5 rounded-lg text-[#B0AAA4] hover:bg-[#F5F0EB]"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#E9F1F0] flex items-center justify-center flex-shrink-0">
          <Car className="w-4 h-4 text-[#5C8D89]" />
        </div>
        <div className="flex-1 pr-4">
          <p className="text-sm font-semibold text-[#1A1A1A]">Turn on Commute</p>
          <p className="text-xs text-[#8A8580] mt-0.5 leading-relaxed">
            Your ride is usually 4+ hours a week that nothing touches. Set it up once and we'll fill it.
          </p>
          <button
            onClick={onSetUp}
            className="mt-3 px-3.5 py-2 rounded-xl bg-[#1A1A1A] text-white text-xs font-semibold"
          >
            Set it up
          </button>
        </div>
      </div>
    </motion.div>
  );
}