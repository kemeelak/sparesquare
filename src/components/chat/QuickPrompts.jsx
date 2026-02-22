import React from "react";
import { motion } from "framer-motion";

const PROMPTS = {
  fitness: [
    "Build me a morning workout I can do in 20 minutes at home",
    "I skipped my workout today — how do I get back on track?",
    "What's the best exercise for my energy level right now?",
    "Design a 4-week progressive plan for me",
  ],
  mindfulness: [
    "Walk me through a quick stress reset right now",
    "I keep skipping my meditation — why and how do I fix it?",
    "What's the minimum effective dose of mindfulness for busy days?",
    "Help me build an evening wind-down routine",
  ],
  learning: [
    "How do I make my learning actually stick?",
    "I want to read more but never find time — help",
    "Create a daily learning habit that fits my schedule",
    "What's the best way to retain what I read?",
  ],
  nutrition: [
    "Build me a simple meal prep plan for the week",
    "What should I eat to optimize my energy today?",
    "I always eat badly when I'm tired — how do I fix this?",
    "Give me 3 high-protein snacks I can prep in 5 minutes",
  ],
  sleep: [
    "I'm not hitting my sleep goal — what's stopping me?",
    "Build me a wind-down routine for better sleep",
    "How do I shift my sleep time earlier without suffering?",
    "Why do I feel tired even after 8 hours of sleep?",
  ],
  productivity: [
    "I have spare time today — what should I prioritize?",
    "Help me design my ideal morning routine",
    "I keep procrastinating — what's actually going on?",
    "How do I protect deep work time in my schedule?",
  ],
  social: [
    "How do I maintain friendships when life is busy?",
    "I want to be a better communicator — where do I start?",
    "Help me carve out time for the people that matter",
    "How do I say no without feeling guilty?",
  ],
  creative: [
    "How do I find time to create when I'm always busy?",
    "I haven't been creative lately — help me restart",
    "Build me a daily creative practice habit",
    "How do I overcome creative blocks?",
  ],
  general: [
    "Look at my schedule today — what am I missing?",
    "I'm not making progress on my goals. Be honest with me.",
    "What habit should I add to my grid this week?",
    "Hold me accountable — what should I have done by tonight?",
    "I have a spare hour right now — what's the best use of it?",
    "How close am I to living the life I actually want?",
  ],
};

export default function QuickPrompts({ category, onSelect }) {
  const prompts = PROMPTS[category] || PROMPTS.general;

  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((p, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => onSelect(p)}
          className="text-xs px-3 py-2 rounded-xl bg-[#F5F0EB] text-[#4A5568] hover:bg-[#E8E4DF] hover:text-[#1A1A1A] transition-all border border-transparent hover:border-[#D8D3CE] text-left"
        >
          {p}
        </motion.button>
      ))}
    </div>
  );
}