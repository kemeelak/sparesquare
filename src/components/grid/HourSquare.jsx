import React from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Lock } from "lucide-react";

const categoryIcons = {
  fitness: "🏃",
  mindfulness: "🧘",
  learning: "📚",
  nutrition: "🥗",
  sleep: "😴",
  productivity: "⚡",
  social: "👥",
  creative: "🎨",
};

export default function HourSquare({ hour, unmovable, habit, isSpare, isSleep, onSquareClick, compact }) {
  const formatHour = (h) => {
    if (h === 0) return "12a";
    if (h === 12) return "12p";
    if (h < 12) return `${h}a`;
    return `${h - 12}p`;
  };

  let bgClass = "bg-white border-[#E8E4DF]";
  let textClass = "text-[#B0AAA4]";
  let content = null;

  if (isSleep) {
    bgClass = "bg-[#2D3748] border-[#2D3748]";
    textClass = "text-[#718096]";
    content = <span className="text-xs">😴</span>;
  } else if (unmovable) {
    bgClass = "bg-[#4A5568] border-[#4A5568]";
    textClass = "text-white";
    content = (
      <div className="flex flex-col items-center gap-0.5">
        <Lock className="w-3 h-3 opacity-60" />
        <span className="text-[9px] font-medium leading-tight text-center truncate max-w-full px-0.5">
          {unmovable.label}
        </span>
      </div>
    );
  } else if (habit) {
    const isConfirmed = habit.status === "confirmed" || habit.status === "completed";
    const isCompleted = habit.status === "completed";
    bgClass = isConfirmed
      ? "bg-[#7C9A82] border-[#7C9A82]"
      : "bg-transparent border-[#7C9A82] border-dashed border-2";
    textClass = isConfirmed ? "text-white" : "text-[#7C9A82]";
    content = (
      <div className="flex flex-col items-center gap-0.5">
        {isCompleted ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <span className="text-xs">{categoryIcons[habit.category] || "✨"}</span>
        )}
        <span className="text-[9px] font-medium leading-tight text-center truncate max-w-full px-0.5">
          {habit.title}
        </span>
      </div>
    );
  } else if (isSpare) {
    bgClass = "bg-[#F5EDE4] border-[#D4A574] border-dashed";
    textClass = "text-[#D4A574]";
    content = <Sparkles className="w-3.5 h-3.5" />;
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onSquareClick?.(hour)}
      className={`relative aspect-square rounded-xl border-2 ${bgClass} ${textClass} 
        flex flex-col items-center justify-center transition-colors duration-200
        ${compact ? "p-1" : "p-1.5"} cursor-pointer`}
    >
      <span className={`absolute top-1 left-1.5 text-[9px] font-mono opacity-60 ${textClass}`}>
        {formatHour(hour)}
      </span>
      <div className="mt-2">{content}</div>
    </motion.button>
  );
}