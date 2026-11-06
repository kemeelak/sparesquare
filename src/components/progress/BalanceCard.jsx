import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { computeBalance, balanceHeadline } from "@/lib/lifeAreas";
import BucketSheet from "@/components/progress/BucketSheet";

export default function BalanceCard({ habits = [], profile }) {
  const [openBucket, setOpenBucket] = useState(null);
  const balance = computeBalance(habits, profile);
  const headline = balanceHeadline(balance);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-5 border border-[#E8E4DF] mb-6"
      >
        <div className="flex items-baseline justify-between mb-1">
          <p className="font-semibold text-[#1A1A1A] text-sm">Your five buckets</p>
          <span className="text-[10px] text-[#B0AAA4]">last 7 days</span>
        </div>
        <p className="text-[11px] text-[#8A8580] mb-3">Where your logged hours actually went.</p>

        <div className="flex items-start gap-2 rounded-xl bg-[#F5EDE4] px-3 py-2.5 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-[#D4A574] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#6B5B48] leading-snug">{headline}</p>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {balance.buckets.map((b, i) => {
            const fill = Math.min(100, Math.round(b.progress * 100));
            const full = b.progress >= 1;
            return (
              <button
                key={b.key}
                onClick={() => setOpenBucket(b)}
                className="flex flex-col items-center gap-1 group"
                aria-label={`${b.label}: ${b.hours} of ${b.target} hours`}
              >
                <div
                  className="relative w-full h-24 rounded-xl border overflow-hidden transition-transform group-active:scale-95"
                  style={{ borderColor: "#E8E4DF", backgroundColor: b.tint }}
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${fill}%` }}
                    transition={{ duration: 0.7, delay: i * 0.06, ease: "easeOut" }}
                    className="absolute inset-x-0 bottom-0"
                    style={{ backgroundColor: b.color, opacity: 0.85 }}
                  />
                  {fill > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 + i * 0.06 }}
                      className="absolute inset-x-0 h-[2px]"
                      style={{ bottom: `${fill}%`, backgroundColor: "#FFFFFF", opacity: 0.5 }}
                    />
                  )}
                  <span className="absolute inset-x-0 bottom-1.5 text-center text-base leading-none">
                    {b.emoji}
                  </span>
                  {full && (
                    <span
                      className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
                      style={{ backgroundColor: b.color }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-semibold text-[#1A1A1A] leading-tight text-center truncate w-full">
                  {b.short}
                </p>
                <p className="text-[9px] text-[#8A8580] tabular-nums leading-none">
                  {b.hours}h / {b.target}h
                </p>
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-[#B0AAA4] mt-4 leading-snug">
          Bottles fill toward the split your own goals suggest, not equal fifths. Tap one to see or move what's inside.
        </p>
      </motion.div>

      {openBucket && (
        <BucketSheet
          bucket={openBucket}
          habits={habits}
          onClose={() => setOpenBucket(null)}
        />
      )}
    </>
  );
}