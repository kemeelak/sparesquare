import React from "react";
import { motion } from "framer-motion";

const prompts = {
  fitness: [
    "Build me a workout routine for my schedule",
    "What's a good morning workout under 20 min?",
    "Help me stay consistent with exercise",
  ],
  mindfulness: [
    "Teach me a quick breathwork exercise",
    "How do I build a meditation habit?",
    "I'm stressed — what can I do right now?",
  ],
  learning: [
    "Help me learn something new in 15 min a day",
    "How do I retain what I read?",
    "What books align with my growth focus?",
  ],
  nutrition: [
    "What should I eat to fuel my mornings?",
    "Help me plan a simple meal prep routine",
    "How do I cut out sugar gradually?",
  ],
  sleep: [
    "How do I improve my sleep quality?",
    "What's a good wind-down routine?",
    "I keep waking up tired — help me fix this",
  ],
  productivity: [
    "Plan my most productive morning",
    "How do I stop procrastinating?",
    "Give me a time-blocking strategy",
  ],
  social: [
    "How do I maintain closer friendships?",
    "I feel isolated — what can I do?",
    "Help me build my network intentionally",
  ],
  creative: [
    "Help me start a creative practice",
    "I have 30 min free — what creative thing can I do?",
    "How do I get out of a creative rut?",
  ],
  general: [
    "What should I focus on today?",
    "How am I doing on my goals?",
    "What's one thing I can change this week?",
  ],
};

export default function QuickPrompts({ category = "general", onSelect }) {
  const list = prompts[category] || prompts.general;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {list.map((p, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          onClick={() => onSelect(p)}
          className="text-xs px-3 py-2 rounded-xl bg-[#F5F0EB] text-[#4A5568] hover:bg-[#E8E4DF] border border-[#E8E4DF] transition-colors text-left"
        >
          {p}
        </motion.button>
      ))}
    </div>
  );
}