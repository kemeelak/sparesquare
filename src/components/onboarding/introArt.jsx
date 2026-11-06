import React from "react";
import { motion } from "framer-motion";

// A 24-hour day, one square per hour, so the intro can show the same grid twice.
const DAY = [
  "sleep", "sleep", "sleep", "sleep", "sleep", "sleep",
  "spare", "spare", "busy", "busy", "busy", "busy",
  "busy", "busy", "busy", "busy", "busy", "spare",
  "busy", "spare", "spare", "spare", "sleep", "sleep",
];
const FLAGGED = [6, 17, 19];

const TONE = {
  sleep: "bg-white/10",
  busy: "bg-white/25",
  spare: "bg-[#7C9A82]/30",
};

function Cell({ kind, flagged, delay, lit }) {
  const spare = kind === "spare";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.35 }}
      className={`aspect-square rounded-[5px] ${lit ? "bg-[#D4A574]" : TONE[kind]}`}
    >
      {flagged && spare && !lit && (
        <motion.div
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: delay + 0.6 }}
          className="w-full h-full rounded-[5px] bg-[#7C9A82]"
        />
      )}
    </motion.div>
  );
}

export function DayGrid({ litHour = null }) {
  return (
    <div className="grid grid-cols-6 gap-1.5 w-full max-w-[228px] mx-auto">
      {DAY.map((kind, i) => (
        <Cell
          key={i}
          kind={kind}
          flagged={FLAGGED.includes(i)}
          delay={i * 0.035}
          lit={litHour === i}
        />
      ))}
    </div>
  );
}

export function GridArt() {
  return (
    <div className="w-full">
      <DayGrid />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="text-[11px] text-[#7C9A82] mt-3 text-center"
      >
        3 spare squares nobody has claimed
      </motion.p>
    </div>
  );
}

const CHIPS = ["Wake 6:30, in bed by 11", "Work 9–5, school run at 3", "Want to read more, lost momentum"];

export function DetailArt() {
  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white/10 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[12px] text-white/80 leading-relaxed max-w-[85%]"
      >
        “I'm up at 6:30 with the kids, work till 5, school run at 3… I keep saying I'll
        read more and I never do.”
      </motion.div>
      <div className="mt-3 space-y-1.5">
        {CHIPS.map((chip, i) => (
          <motion.div
            key={chip}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.45, duration: 0.35 }}
            className="flex items-center gap-2 text-[11px] text-white/85"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A574] flex-shrink-0" />
            {chip}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function PlacedArt() {
  return (
    <div className="w-full">
      <div className="relative max-w-[228px] mx-auto">
        <DayGrid litHour={19} />
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="absolute left-[25%] top-[87%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-[#D4A574] text-[#1A1A1A] text-[10px] font-bold px-2 py-1 rounded-md shadow-lg"
        >
          📖 Read 20 min
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="flex items-center justify-center gap-2 mt-3"
      >
        <span className="text-[11px] text-white/70">🔥 3 days in a row</span>
        <span className="text-[11px] text-[#7C9A82]">· no 5am overhaul</span>
      </motion.div>
    </div>
  );
}

const SPINES = [
  { height: "h-9", tone: "bg-[#7C9A82]" },
  { height: "h-12", tone: "bg-[#D4A574]" },
  { height: "h-10", tone: "bg-white/30" },
  { height: "h-8", tone: "bg-[#4A5568]" },
  { height: "h-11", tone: "bg-white/20" },
];

const DISTILLED = [
  { tag: "Idea", text: "Habits stick to a cue, not willpower" },
  { tag: "Action", text: "Read 20 min after dinner" },
];

export function LibraryArt() {
  return (
    <div className="w-full">
      <div className="flex items-end justify-center gap-1.5 border-b border-white/15 pb-1.5">
        {SPINES.map((spine, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.09, duration: 0.3 }}
            className={`w-2 rounded-sm ${spine.height} ${spine.tone}`}
          />
        ))}
      </div>
      <div className="space-y-1.5 mt-3">
        {DISTILLED.map((row, i) => (
          <motion.div
            key={row.tag}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.75 + i * 0.5, duration: 0.35 }}
            className="flex items-start gap-2"
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#D4A574] w-11 flex-shrink-0 pt-0.5">
              {row.tag}
            </span>
            <span className="text-[11px] text-white/85 leading-snug">{row.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function PartnerArt() {
  return (
    <div className="w-full">
      <div className="flex gap-2">
        <div className="w-7 h-7 rounded-xl bg-[#7C9A82] flex items-center justify-center text-[10px] font-bold text-[#1A1A1A] flex-shrink-0">
          P
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white/10 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[12px] text-white/85 leading-relaxed"
        >
          “Put the book on your pillow before dinner. You told me cues beat willpower, so
          let's use one.”
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="flex flex-wrap gap-1.5 mt-3 pl-9"
      >
        <span className="text-[10px] bg-[#7C9A82]/25 text-[#A9C4AE] px-2 py-1 rounded-md">
          📚 Atomic Habits
        </span>
        <span className="text-[10px] bg-white/10 text-white/60 px-2 py-1 rounded-md">
          from your library
        </span>
        <span className="text-[10px] bg-white/10 text-white/60 px-2 py-1 rounded-md">🔥 3 days</span>
      </motion.div>
    </div>
  );
}

// What the dump gives back: the note, the one thing underneath it, and the move written out.
export function DumpArt() {
  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-[#FFF7E7] rounded-lg px-3 py-2 shadow-lg max-w-[90%]"
      >
        <p className="text-[8.5px] uppercase tracking-[0.12em] text-[#8A7A5E] mb-1">Dumped · 11:42pm</p>
        <p className="text-[11.5px] leading-snug text-[#33464A]">
          “Been meaning to email Dani for three weeks and I keep not doing it.”
        </p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-[10.5px] leading-snug text-[#A9C4AE] mt-2 pl-1"
      >
        Back to you: “Three weeks of silence is what's actually weighing on you.”
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.05, duration: 0.35 }}
        className="mt-2 bg-white/10 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[92%]"
      >
        <p className="text-[8.5px] uppercase tracking-[0.12em] text-[#D4A574] mb-1">
          ✍️ Draft the email for me
        </p>
        <p className="text-[11px] leading-snug text-white/85">
          “Hi Dani — I've been meaning to write for weeks, and I'm sorry I went quiet…”
        </p>
      </motion.div>
    </div>
  );
}