import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { BookOpen, Headphones, Video, FileText, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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
  const [expanded, setExpanded] = useState(false);
  const Icon = typeIcons[source.type] || BookOpen;
  const colorClass = typeColors[source.type] || typeColors.book;

  const addHabitToGrid = async (habit) => {
    await base44.entities.HabitBlock.create({
      title: habit.title,
      description: habit.description,
      source: source.title,
      duration_minutes: habit.duration_minutes || 15,
      energy_level: habit.energy_level || "medium",
      category: habit.category || "learning",
      status: "backlog",
    });
    queryClient.invalidateQueries({ queryKey: ["habits"] });
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
          </div>
        </div>

        {source.habits_extracted?.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-3 text-xs font-medium text-[#7C9A82] hover:text-[#6B8A71] transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {source.habits_extracted.length} habits extracted
          </button>
        )}
      </div>

      {expanded && source.habits_extracted?.length > 0 && (
        <div className="border-t border-[#E8E4DF] px-4 py-3 space-y-2 bg-[#FAF8F5]">
          {source.habits_extracted.map((habit, i) => (
            <div key={i} className="flex items-center justify-between gap-2 py-1.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#1A1A1A] truncate">{habit.title}</p>
                <p className="text-xs text-[#8A8580] truncate">{habit.description}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => addHabitToGrid(habit)}
                className="flex-shrink-0 text-[#7C9A82] hover:bg-[#E8F0EA]"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}