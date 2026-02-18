import React from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function SpareCounter({ count }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 bg-[#F5EDE4] rounded-2xl px-5 py-3 border border-[#D4A574]/30"
    >
      <div className="w-10 h-10 rounded-xl bg-[#D4A574] flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#1A1A1A] leading-none">{count}</p>
        <p className="text-xs text-[#8A8580] font-medium">Spare Squares</p>
      </div>
    </motion.div>
  );
}