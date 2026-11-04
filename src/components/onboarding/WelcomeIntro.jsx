import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { GridArt, DetailArt, LibraryArt, PartnerArt, PlacedArt } from "@/components/onboarding/introArt";

const SCENES = [
  {
    eyebrow: "What you get",
    title: "You already have the hours. You just can't see them.",
    body: "Your day is drawn as a 24-hour grid, and the squares nothing owns are exactly where the things you keep putting off can finally live.",
    Art: GridArt,
  },
  {
    eyebrow: "What you get",
    title: "The books you read once start working daily",
    body: "Everything you're into becomes a library. Each source is pulled apart into the ideas worth keeping and the actions worth trying, so nothing sits unfinished on a shelf.",
    Art: LibraryArt,
  },
  {
    eyebrow: "What you get",
    title: "A partner that already knows your day",
    body: "It talks to you from your own shelf and your own schedule, picks a habit that fits the gap, and checks in when you go quiet.",
    Art: PartnerArt,
  },
  {
    eyebrow: "What I need from you",
    title: "Then just tell me your real day",
    body: "Your actual wake and sleep times, the blocks you can't move, and what keeps stalling. The more honest it is, the less generic the advice.",
    Art: DetailArt,
    hint: ["🎙️ Talk it out", "✍️ Or type", "✅ You review it before it saves"],
  },
  {
    eyebrow: "What happens next",
    title: "One small block, in a square you own",
    body: "Two minutes of questions, no forms, no 5am overhaul. You walk out with one habit sitting in a square that was already spare.",
    Art: PlacedArt,
  },
];

export default function WelcomeIntro({ onDone }) {
  const [scene, setScene] = useState(0);
  const isLast = scene === SCENES.length - 1;
  const { eyebrow, title, body, hint, Art } = SCENES[scene];

  return (
    <div className="bg-[#1A1A1A] rounded-3xl overflow-hidden shadow-xl">
      {/* Step markers — tap one to jump straight there */}
      <div className="flex items-center gap-2 px-5 pt-4">
        <div className="flex-1 flex gap-1.5">
          {SCENES.map((s, i) => (
            <button
              key={s.title}
              onClick={() => setScene(i)}
              aria-label={`Step ${i + 1}: ${s.eyebrow}`}
              className="h-[3px] flex-1 rounded-full bg-white/15 overflow-hidden"
            >
              <div
                className={`h-full bg-[#D4A574] transition-all duration-300 ${
                  i <= scene ? "w-full" : "w-0"
                }`}
              />
            </button>
          ))}
        </div>
        <span className="text-[10px] text-white/30 tabular-nums flex-shrink-0">
          {scene + 1}/{SCENES.length}
        </span>
        <button
          onClick={onDone}
          className="text-[11px] text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
        >
          Skip
        </button>
      </div>

      <div className="px-5 pb-5 pt-5">
        <div className="h-[172px] flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={scene}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <Art />
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`copy-${scene}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4"
          >
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#D4A574] mb-1.5">
              {eyebrow}
            </p>
            <h2 className="text-lg font-bold text-white leading-snug">{title}</h2>
            <p className="text-[13px] text-white/60 leading-relaxed mt-1.5">{body}</p>
            {hint && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {hint.map((h) => (
                  <span key={h} className="text-[10px] bg-white/10 text-white/60 px-2 py-1 rounded-md">
                    {h}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-2.5 mt-5">
          {scene > 0 && (
            <button
              onClick={() => setScene((s) => s - 1)}
              className="h-12 px-4 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 font-medium text-sm flex items-center gap-1.5 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          <button
            onClick={() => (isLast ? onDone() : setScene((s) => s + 1))}
            className="flex-1 h-12 rounded-xl bg-[#D4A574] hover:bg-[#c99968] text-[#1A1A1A] font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {isLast ? "Start the conversation" : "Next"} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}