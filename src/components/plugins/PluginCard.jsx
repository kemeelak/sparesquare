import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Headphones, Video, FileText, ChevronDown, ChevronUp, Plus, Check, Brain, Trash2 } from "lucide-react";

const typeIcons = {
  book: BookOpen,
  podcast: Headphones,
  video: Video,
  article: FileText,
};

const typeColors = {
  book: "bg-[#E8F0EA] text-[#7C9A82]",
  podcast: "bg-[#F5EDE4] text-[#D4A574]",
  video: "bg-[#E2E8F0] text-[#4A5568]",
  article: "bg-[#FEF3C7] text-[#D97706]",
};

export default function PluginCard({ source, queryClient }) {
  const [expandedHabits, setExpandedHabits] = useState(false);
  const [expandedLearnings, setExpandedLearnings] = useState(false);
  const [addedIds, setAddedIds] = useState({});
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Remove "${source.title}" from your library?`)) return;
    setDeleting(true);
    await base44.entities.PluginSource.delete(source.id);
    if (queryClient) queryClient.invalidateQueries({ queryKey: ["pluginSources"] });
  };
  const Icon = typeIcons[source.type] || BookOpen;
  const colorClass = typeColors[source.type] || typeColors.book;

  const addToBacklog = async (habit, index) => {
    if (addedIds[index]) return;
    await base44.entities.HabitBlock.create({
      title: habit.title,
      description: habit.description,
      source: source.title,
      duration_minutes: habit.duration_minutes || 15,
      energy_level: habit.energy_level || "medium",
      category: habit.category || "learning",
      status: "backlog",
    });
    setAddedIds(prev => ({ ...prev, [index]: true }));
    if (queryClient) queryClient.invalidateQueries({ queryKey: ["habits"] });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#1A1A1A] truncate">{source.title}</h3>
            <p className="text-xs text-[#8A8580]">{source.author || "Unknown"} · {source.type}</p>
            {source.summary && (
              <p className="text-xs text-[#8A8580] mt-1 line-clamp-2">{source.summary}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-3 items-center justify-between">
          {source.habits_extracted?.length > 0 && (
            <button
              onClick={() => setExpandedHabits(!expandedHabits)}
              className="flex items-center gap-1 text-xs font-medium text-[#7C9A82] hover:text-[#6B8A71] transition-colors"
            >
              {expandedHabits ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {source.habits_extracted.length} habits
            </button>
          )}
          {source.learnings?.length > 0 && (
            <button
              onClick={() => setExpandedLearnings(!expandedLearnings)}
              className="flex items-center gap-1 text-xs font-medium text-[#D4A574] hover:text-[#C4945A] transition-colors"
            >
              <Brain className="w-3 h-3" />
              {source.learnings.length} principles
            </button>
          )}
        </div>
      </div>

      {/* Habits */}
      <AnimatePresence>
        {expandedHabits && source.habits_extracted?.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[#E8E4DF] bg-[#FAF8F5] overflow-hidden"
          >
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] font-semibold text-[#7C9A82] uppercase tracking-wide mb-2">Add to Backlog</p>
              {source.habits_extracted.map((habit, i) => (
                <div key={i} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{habit.title}</p>
                    <div className="flex gap-2 mt-0.5">
                      {habit.frequency && (
                        <span className="text-[10px] text-[#8A8580]">{habit.frequency}</span>
                      )}
                      {habit.duration_minutes && (
                        <span className="text-[10px] text-[#B0AAA4]">{habit.duration_minutes}min</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => addToBacklog(habit, i)}
                    className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      addedIds[i]
                        ? "bg-[#7C9A82] text-white"
                        : "bg-white border border-[#E8E4DF] text-[#7C9A82] hover:bg-[#E8F0EA] hover:border-[#7C9A82]"
                    }`}
                  >
                    {addedIds[i] ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Learnings / Principles */}
      <AnimatePresence>
        {expandedLearnings && source.learnings?.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[#E8E4DF] bg-[#FDF8F4] overflow-hidden"
          >
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-[#D4A574] uppercase tracking-wide mb-2">Partner Principles</p>
              <div className="space-y-2">
                {source.learnings.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-[#D4A574] mt-0.5 flex-shrink-0">•</span>
                    <div>
                      <p className="text-xs font-medium text-[#1A1A1A]">{l.principle}</p>
                      {l.explanation && <p className="text-[11px] text-[#8A8580]">{l.explanation}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}