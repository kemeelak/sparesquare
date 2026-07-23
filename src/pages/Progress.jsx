import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { Flame, Check, Target, TrendingUp, ArrowLeft } from "lucide-react";
import { createPageUrl } from "../utils";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function Progress() {
  const currentUser = useCurrentUser();

  const { data: habits } = useQuery({
    queryKey: ["habits"],
    queryFn: () => base44.entities.HabitBlock.filter({ created_by_id: currentUser.id }),
    initialData: [],
    enabled: !!currentUser,
  });

  const { data: profiles } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.filter({ created_by_id: currentUser.id }),
    initialData: [],
    enabled: !!currentUser,
  });

  const profile = profiles[0];

  // Build last 14 days of data
  const today = new Date();
  const days = eachDayOfInterval({ start: subDays(today, 13), end: today });

  const chartData = days.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const dayHabits = habits.filter(h => h.scheduled_date === dateStr && h.status !== "backlog");
    const completed = dayHabits.filter(h => h.status === "completed").length;
    const total = dayHabits.length;
    return {
      date: format(day, "EEE"),
      dateStr,
      completed,
      total,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  // Streak calculation
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const d = chartData[i];
    if (d.completed > 0) streak++;
    else if (i < days.length - 1) break;
  }

  // All-time stats
  const allCompleted = habits.filter(h => h.status === "completed");
  const totalScheduled = habits.filter(h => h.status !== "backlog");

  // Category breakdown
  const categoryCounts = {};
  allCompleted.forEach(h => {
    const cat = h.category || "other";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const categoryEmoji = {
    fitness: "💪", mindfulness: "🧘", learning: "📚",
    nutrition: "🥗", sleep: "😴", productivity: "⚡",
    social: "❤️", creative: "🎨",
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to={createPageUrl("Home")} className="p-2 rounded-xl hover:bg-[#F5F0EB] transition-colors">
          <ArrowLeft className="w-5 h-5 text-[#4A5568]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Your Progress</h1>
          <p className="text-sm text-[#8A8580]">See the habits you're building</p>
        </div>
      </div>

      {/* Streak + stats cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Streak", value: `${streak}d`, icon: Flame, color: "text-[#D4A574] bg-[#F5EDE4]" },
          { label: "Completed", value: allCompleted.length, icon: Check, color: "text-[#7C9A82] bg-[#E8F0EA]" },
          { label: "Scheduled", value: totalScheduled.length, icon: Target, color: "text-[#4A5568] bg-[#E2E8F0]" },
        ].map((item) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 border border-[#E8E4DF] flex flex-col items-center text-center"
          >
            <div className={`w-8 h-8 rounded-xl ${item.color} flex items-center justify-center mb-2`}>
              <item.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-[#1A1A1A]">{item.value}</p>
            <p className="text-xs text-[#8A8580] font-medium">{item.label}</p>
          </motion.div>
        ))}
      </div>

      {/* 14-day chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-5 border border-[#E8E4DF] mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#7C9A82]" />
          <p className="font-semibold text-[#1A1A1A] text-sm">Last 14 Days</p>
        </div>
        {chartData.some(d => d.total > 0) ? (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} barSize={16}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8A8580" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(val) => [`${val} done`, ""]}
                contentStyle={{ borderRadius: 12, border: "1px solid #E8E4DF", fontSize: 12 }}
              />
              <Bar dataKey="completed" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.completed > 0 ? "#7C9A82" : "#E8E4DF"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-[#B0AAA4] text-sm">
            Complete some habits to see your chart here
          </div>
        )}
      </motion.div>

      {/* Category breakdown */}
      {topCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-5 border border-[#E8E4DF] mb-6"
        >
          <p className="font-semibold text-[#1A1A1A] text-sm mb-4">Top Habit Categories</p>
          <div className="space-y-3">
            {topCategories.map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-lg">{categoryEmoji[cat] || "⭐"}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-[#1A1A1A] capitalize">{cat}</span>
                    <span className="text-xs text-[#8A8580]">{count}x</span>
                  </div>
                  <div className="h-2 bg-[#F5F0EB] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#7C9A82] rounded-full"
                      style={{ width: `${Math.min(100, (count / (topCategories[0][1] || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Goals from profile */}
      {profile?.goals?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-5 border border-[#E8E4DF]"
        >
          <p className="font-semibold text-[#1A1A1A] text-sm mb-3">Your Goals</p>
          <div className="space-y-2">
            {profile.goals.map((goal, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-[#E8F0EA] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-[#7C9A82]" />
                </div>
                <p className="text-sm text-[#4A5568]">{goal}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}