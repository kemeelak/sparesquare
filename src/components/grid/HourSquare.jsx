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

export default function HourSquare({ hour, unmovable, habit, habits = [], isSpare, isSleep, onSquareClick }) {
  const formatHour = (h) => {
    if (h === 0) return "12a";
    if (h === 12) return "12p";
    if (h < 12) return `${h}a`;
    return `${h - 12}p`;
  };

  let bgClass = "bg-white border-[#E8E4DF]";
  let textClass = "text-[#B0AAA4]";
  let emoji = null;

  if (isSleep) {
    bgClass = "bg-[#2D3748] border-[#2D3748]";
    textClass = "text-[#718096]";
    emoji = "😴";
  } else if (unmovable) {
    bgClass = "bg-[#4A5568] border-[#4A5568]";
    textClass = "text-white";
    const label = (unmovable.label || "").toLowerCase();
    if (label.includes("work") || label.includes("shift")) emoji = "💼";
    else if (label.includes("school") || label.includes("class") || label.includes("course") || label.includes("study")) emoji = "🎓";
    else if (label.includes("commute")) emoji = "🚗";
    else if (label.includes("gym") || label.includes("pt")) emoji = "🏋️";
    else if (label.includes("medical") || label.includes("doctor") || label.includes("health")) emoji = "🏥";
    else if (label.includes("religi") || label.includes("prayer") || label.includes("church") || label.includes("mosque")) emoji = "🙏";
    else if (label.includes("caring") || label.includes("family") || label.includes("childcare") || label.includes("school run")) emoji = "👨‍👩‍👧";
    else emoji = "🔒";
  } else if (habit) {
    const isConfirmed = habit.status === "confirmed" || habit.status === "completed";
    const isCompleted = habit.status === "completed";
    bgClass = isConfirmed
      ? "bg-[#7C9A82] border-[#7C9A82]"
      : "bg-transparent border-[#7C9A82] border-dashed border-2";
    textClass = isConfirmed ? "text-white" : "text-[#7C9A82]";
    emoji = isCompleted ? "✅" : (categoryIcons[habit.category] || "✨");
    multiCount = habits.length > 1 ? habits.length : null;
  } else if (isSpare) {
    bgClass = "bg-[#F5EDE4] border-[#D4A574] border-dashed";
    textClass = "text-[#D4A574]";
    emoji = "✨";
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onSquareClick?.(hour)}
      className={`relative w-full aspect-square rounded-xl border-2 ${bgClass} ${textClass} 
        flex flex-col items-center justify-center transition-colors duration-200 cursor-pointer p-1`}
    >
      <span className={`absolute top-0.5 left-1 text-[8px] font-mono opacity-50 ${textClass}`}>
        {formatHour(hour)}
      </span>
      {emoji && <span className="text-base leading-none mt-1">{emoji}</span>}
    </motion.button>
  );
}