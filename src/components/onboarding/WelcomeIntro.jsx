import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { GridArt, DetailArt, LibraryArt, PartnerArt, PlacedArt } from "@/components/onboarding/introArt";

const SCENES = [
  {
    eyebrow: "What it does",
    title: "It finds the hours your day is hiding",
    body: "Give me your real day and I'll lay it on a 24-hour grid. The squares nothing owns are where you grow.",
    Art: GridArt,
  },
  {
    eyebrow: "What to tell me",
    title: "Specifics are the whole trick",
    body: "Your actual wake and sleep times, what you can't move, and what you keep failing to start. Talk it out if typing is a bore.",
    Art: DetailArt,
  },
  {
    eyebrow: "The library",
    title: "Feed it a book, get the useful parts",
    body: "Drop in books, podcasts and videos. Each one gets pulled apart into the ideas worth keeping and the actions worth trying.",
    Art: LibraryArt,
  },
  {
    eyebrow: "Your Partner",
    title: "It coaches you from your own shelf",
    body: "Everything it says is built on what you put in the library, so the advice sounds like it came from something you actually read.",
    Art: PartnerArt,
  },
  {
    eyebrow: "What happens next",
    title: "One small block, in a square you own",
    body: "It picks a habit that fits the gap, not a 5am overhaul, and checks in when you go quiet.",
    Art: PlacedArt,
  },
];

const SCENE_MS = 4000;

export default function WelcomeIntro({ onDone }) {
  const [scene, setScene] = useState(0);
  const isLast = scene === SCENES.length - 1;
  const { eyebrow, title, body, Art } = SCENES[scene];

  useEffect(() => {
    if (isLast) return;
    const timer = setTimeout(() => setScene((s) => s + 1), SCENE_MS);
    return () => clearTimeout(timer);
  }, [scene, isLast]);

  const next = () => (isLast ? onDone() : setScene((s) => s + 1));

  return (
    <div className="bg-[#1A1A1A] rounded-3xl overflow-hidden shadow-xl">
      {/* Progress + skip */}
      <div className="flex items-center gap-2 px-5 pt-4">
        <div className="flex-1 flex gap-1.5">
          {SCENES.map((s, i) => (
            <div key={s.title} className="h-[3px] flex-1 rounded-full bg-white/15 overflow-hidden">
              <motion.div
                initial={false}
                animate={{ width: i < scene ? "100%" : i === scene ? "100%" : "0%" }}
                transition={{ duration: i === scene && !isLast ? SCENE_MS / 1000 : 0.3, ease: "linear" }}
                className="h-full bg-[#D4A574]"
              />
            </div>
          ))}
        </div>
        <button
          onClick={onDone}
          className="text-[11px] text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
        >
          Skip
        </button>
      </div>

      <div onClick={next} className="px-5 pb-5 pt-5 cursor-pointer select-none">
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
          </motion.div>
        </AnimatePresence>

        {isLast ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDone();
            }}
            className="w-full h-12 mt-5 rounded-xl bg-[#D4A574] hover:bg-[#c99968] text-[#1A1A1A] font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            Start the conversation <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="mt-5 text-[13px] font-medium text-white/45 hover:text-white/80 transition-colors flex items-center gap-1"
          >
            Next <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}