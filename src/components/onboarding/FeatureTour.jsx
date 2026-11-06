import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

const STEPS = [
  {
    emoji: "🟦",
    title: "This is your grid",
    body: "Every square is one hour of today. Dark squares are already spoken for, light ones are still yours to use.",
    where: "Home",
  },
  {
    emoji: "⏳",
    title: "Find your spare hours",
    body: "The counter at the top shows how many hours today you can still claim. Tap any square to put something in it.",
    where: "Home",
  },
  {
    emoji: "🔄",
    title: "It fills itself",
    body: "Connect your calendar and your sleep tracker, and your real commitments and last night's rest land on the grid for you.",
    where: "Home · Calendar",
  },
  {
    emoji: "💬",
    title: "Your partner, who knows your week",
    body: "Your coach sees your schedule, your habits, and everything in your library. Short replies, always with a next step.",
    where: "Partner · Talk",
  },
  {
    emoji: "🗒️",
    title: "Dump it instead of carrying it",
    body: "Rant, type or drop a voice note. Open it and it comes back as the one thing underneath, the move to make today — and the email or message you've been avoiding, drafted so you only have to send it.",
    where: "Partner · Dump",
  },
  {
    emoji: "📚",
    title: "Turn what you consume into habits",
    body: "Add a book, podcast or video to your library. It pulls out the principles and the habits, and you schedule the ones worth keeping.",
    where: "Library",
  },
  {
    emoji: "🗂️",
    title: "Nothing gets lost",
    body: "Ideas that don't fit today wait in your backlog. Progress tracks streaks, sleep and mood. Friends keep you honest when you go quiet.",
    where: "Backlog · Progress · Friends",
  },
];

export default function FeatureTour({ onDone }) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-[#1A1A1A]/55 backdrop-blur-sm flex items-end lg:items-center justify-center p-4 pb-8 lg:pb-4"
    >
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-sm bg-[#FAF8F5] rounded-3xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-[#1A1A1A]" : i < index ? "w-1.5 bg-[#7C9A82]" : "w-1.5 bg-[#E2DDD7]"
                }`}
              />
            ))}
          </div>
          <button onClick={onDone} className="text-xs font-medium text-[#8A8580] hover:text-[#1A1A1A] transition-colors">
            Skip
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.title}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-white border border-[#E8E4DF] flex items-center justify-center text-3xl mb-5">
              {step.emoji}
            </div>
            <h2 className="text-xl font-bold text-[#1A1A1A] leading-tight mb-2">{step.title}</h2>
            <p className="text-sm text-[#4A5568] leading-relaxed mb-5">{step.body}</p>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#8A8580] bg-white border border-[#E8E4DF] rounded-full px-3 py-1">
              Find it in {step.where}
            </p>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={() => (isLast ? onDone() : setIndex(index + 1))}
          className="w-full mt-7 h-12 rounded-xl bg-[#1A1A1A] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#333] transition-colors"
        >
          {isLast ? (
            <>
              <Check className="w-4 h-4" /> Start using it
            </>
          ) : (
            <>
              Next <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}