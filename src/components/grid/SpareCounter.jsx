import React from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function SpareCounter({ count }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5 bg-[#F5EDE4] rounded-xl px-3 py-1.5 border border-[#D4A574]/30"
    >
      <Sparkles className="w-3.5 h-3.5 text-[#D4A574]" />
      <p className="text-sm font-bold text-[#1A1A1A]">{count}</p>
      <p className="text-xs text-[#8A8580] font-medium">spare</p>
    </motion.div>
  );
}