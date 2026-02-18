import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Calendar, Zap, Clock, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ScheduleSheet from "../components/backlog/ScheduleSheet";

const energyColors = {
  low: "bg-[#E8F0EA] text-[#7C9A82]",
  medium: "bg-[#FEF3C7] text-[#D97706]",
  high: "bg-[#FEE2E2] text-[#DC2626]",
};

const categoryEmoji = {
  fitness: "🏃",
  mindfulness: "🧘",
  learning: "📚",
  nutrition: "🥗",
  sleep: "😴",
  productivity: "⚡",
  social: "👥",
  creative: "🎨",
};

export default function Backlog() {
  const [scheduling, setScheduling] = useState(null);
  const queryClient = useQueryClient();

  const { data: habits, isLoading } = useQuery({
    queryKey: ["habits"],
    queryFn: () => base44.entities.HabitBlock.list(),
    initialData: [],
  });

  const backlogHabits = habits.filter((h) => h.status === "backlog");

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HabitBlock.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });

  const scheduleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HabitBlock.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      setScheduling(null);
    },
  });

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Backlog</h1>
        <p className="text-sm text-[#8A8580]">
          {backlogHabits.length} habits waiting for a Spare Square
        </p>
      </div>

      {/* Habits */}
      <div className="space-y-3">
        <AnimatePresence>
          {backlogHabits.map((habit) => (
            <motion.div
              key={habit.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="bg-white rounded-2xl border border-[#E8E4DF] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F5F0EB] flex items-center justify-center text-lg flex-shrink-0">
                  {categoryEmoji[habit.category] || "✨"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#1A1A1A]">{habit.title}</h3>
                  {habit.description && (
                    <p className="text-xs text-[#8A8580] mt-0.5 line-clamp-2">{habit.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {habit.source && (
                      <Badge variant="outline" className="text-[10px] rounded-full border-[#E8E4DF]">
                        {habit.source}
                      </Badge>
                    )}
                    <Badge className={`text-[10px] rounded-full ${energyColors[habit.energy_level || "medium"]}`}>
                      <Zap className="w-2.5 h-2.5 mr-0.5" />
                      {habit.energy_level || "medium"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] rounded-full border-[#E8E4DF]">
                      <Clock className="w-2.5 h-2.5 mr-0.5" />
                      {habit.duration_minutes || 15}min
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-[#F5F0EB]">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(habit.id)}
                  className="text-[#B0AAA4] hover:text-red-500 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => setScheduling(habit)}
                  className="ml-auto bg-[#7C9A82] hover:bg-[#6B8A71] text-white rounded-xl"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  Schedule
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {backlogHabits.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[#F5F0EB] flex items-center justify-center mx-auto mb-4">
            <Layers className="w-7 h-7 text-[#8A8580]" />
          </div>
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-1">Backlog empty</h2>
          <p className="text-sm text-[#8A8580]">Add sources in the Library or chat with your Partner</p>
        </div>
      )}

      {/* Schedule Sheet */}
      <AnimatePresence>
        {scheduling && (
          <ScheduleSheet
            habit={scheduling}
            onClose={() => setScheduling(null)}
            onSchedule={(hour, date) => {
              scheduleMutation.mutate({
                id: scheduling.id,
                data: {
                  scheduled_hour: hour,
                  scheduled_date: format(date, "yyyy-MM-dd"),
                  status: "suggested",
                },
              });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}