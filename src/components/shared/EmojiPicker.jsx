import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EMOJI_SETS = {
  fitness: ["🏃", "💪", "🤸", "🚴", "🏋️", "🧘", "⚽", "🏀", "🥊", "🧗"],
  mindfulness: ["🧘", "🌿", "🌸", "🕯️", "🕉️", "🧘‍♀️", "🍃", "🪷", "☯️", "🌬️"],
  learning: ["📚", "📖", "🎓", "✏️", "🧠", "🔬", "💡", "📓", "🖊️", "🧩"],
  nutrition: ["🥗", "🍎", "🥦", "🍲", "🥑", "🥤", "🍵", "🥘", "🍌", "🫐"],
  sleep: ["😴", "🌙", "🛏️", "💤", "🌃", "⭐", "🝆", "🛌", "☄️", "🌠"],
  productivity: ["⚡", "✅", "🎯", "📋", "🚀", "⏰", "📅", "✍️", "🗂️", "📌"],
  social: ["👥", "❤️", "💬", "🤝", "🎉", "👋", "🫂", "📞", "💌", "👯"],
  creative: ["🎨", "✏️", "🖌️", "🎸", "🎤", "📸", "🎭", "✂️", "🎹", "🎬"],
  general: ["✨", "🔥", "⭐", "🌟", "💫", "🎉", "🍀", "🌈", "☀️", "🌙", "❄️", "💎", "🏆", "🎁", "🔍", "🧭", "⚙️", "🪄", "🔔", "❤️‍🔥"],
};

export default function EmojiPicker({ value, onChange, defaultEmoji = "✨", label }) {
  const [open, setOpen] = useState(false);
  const [activeSet, setActiveSet] = useState("general");

  const current = value || defaultEmoji;

  return (
    <div className="relative">
      {label && <p className="text-xs text-[#8A8580] mb-1.5">{label}</p>}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E8E4DF] bg-white hover:border-[#1A1A1A] transition-colors"
      >
        <span className="text-xl leading-none">{current}</span>
        <span className="text-xs text-[#4A5568]">{value ? "Change" : "Pick emoji"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute z-50 mt-2 bg-white rounded-2xl shadow-xl border border-[#E8E4DF] p-3 w-64"
            >
              {/* Category tabs */}
              <div className="flex gap-1 mb-2 overflow-x-auto scrollbar-hide pb-1">
                {Object.keys(EMOJI_SETS).map(set => (
                  <button
                    key={set}
                    type="button"
                    onClick={() => setActiveSet(set)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium capitalize whitespace-nowrap transition-colors ${
                      activeSet === set ? "bg-[#1A1A1A] text-white" : "bg-[#F5F0EB] text-[#4A5568] hover:bg-[#E8E4DF]"
                    }`}
                  >
                    {set}
                  </button>
                ))}
              </div>
              {/* Emoji grid */}
              <div className="grid grid-cols-5 gap-1">
                {EMOJI_SETS[activeSet].map((em, i) => (
                  <button
                    key={`${em}-${i}`}
                    type="button"
                    onClick={() => { onChange(em); setOpen(false); }}
                    className={`aspect-square flex items-center justify-center rounded-lg text-xl hover:bg-[#F5F0EB] transition-colors ${
                      value === em ? "bg-[#E8F0EA] ring-2 ring-[#7C9A82]" : ""
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
              {/* Clear / use default */}
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="w-full mt-2 text-xs text-[#8A8580] hover:text-[#1A1A1A] py-1"
              >
                Use category default
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}