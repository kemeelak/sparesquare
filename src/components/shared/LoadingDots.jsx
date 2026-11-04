import React from "react";
import { motion } from "framer-motion";

export default function LoadingDots() {
  return (
    <div className="flex justify-start mb-3">
      <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] flex items-center justify-center mr-2 flex-shrink-0">
        <span className="text-white text-[10px] font-bold">S²</span>
      </div>
      <div className="bg-white border border-[#E8E4DF] rounded-2xl rounded-bl-md px-5 py-4 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-[#B0AAA4]"
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}