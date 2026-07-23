import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const EMOJI_OPTIONS = [
  "🏢", "📚", "🏋️", "🚗", "🙏", "👨‍👩‍👧", "💼", "🎓", "🏥", "🧘", "🎨", "🍽️", "☕", "🌙", "⚡", "🔒", "🏠", "🎯",
  "🎵", "🎮", "✈️", "🏊", "🚴", "🧹", "💊", "🐕", "🌿", "📝", "💻", "📞", "🛒", "🏃", "🧠", "❤️", "🌅", "🔥",
  "🎤", "📊", "🍳", "🧘‍♂️", "🤝", "🛌", "🧺", "🌳", "⚽", "🎸", "📖", "🧪", "🏡", "🚿", "🧴", "💰", "🎭", "🎬",
];
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const value = h + (i % 2 === 0 ? 0 : 0.5);
  if (h === 0) return { label: `12:${m} AM`, value };
  if (h === 12) return { label: `12:${m} PM`, value };
  if (h < 12) return { label: `${h}:${m} AM`, value };
  return { label: `${h - 12}:${m} PM`, value };
});

const DAY_OPTIONS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

export default function EditUnmovableSheet({ unmovable, index, profile, onClose }) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState(unmovable.label || "");
  const [emoji, setEmoji] = useState(unmovable.emoji || "🔒");
  const [startHour, setStartHour] = useState(unmovable.start_hour ?? 9);
  const [endHour, setEndHour] = useState(unmovable.end_hour ?? 17);
  // Support half-hour values stored as decimals (e.g. 9.5 = 9:30)
  const [days, setDays] = useState(unmovable.days || ["monday","tuesday","wednesday","thursday","friday"]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const newUnmovables = [...(profile.unmovables || [])];
      newUnmovables[index] = { ...unmovable, label, emoji, start_hour: startHour, end_hour: endHour, days };
      return base44.entities.UserProfile.update(profile.id, { unmovables: newUnmovables });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const newUnmovables = (profile.unmovables || []).filter((_, i) => i !== index);
      return base44.entities.UserProfile.update(profile.id, { unmovables: newUnmovables });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      onClose();
    },
  });

  const toggleDay = (day) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-5">
          <p className="font-bold text-[#1A1A1A] text-lg">Edit Block</p>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB]">
            <X className="w-5 h-5 text-[#8A8580]" />
          </button>
        </div>

        {/* Label */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-[#8A8580] uppercase tracking-wide mb-1.5 block">Name</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-xl border border-[#E8E4DF] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10"
            placeholder="Block name..."
          />
        </div>

        {/* Emoji */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-[#8A8580] uppercase tracking-wide mb-1.5 block">Emoji</label>
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${emoji === e ? "bg-[#1A1A1A] ring-2 ring-[#1A1A1A]" : "bg-[#F5F0EB] hover:bg-[#E8E4DF]"}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[#8A8580] uppercase tracking-wide mb-1.5 block">Start Time</label>
            <select
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="w-full rounded-xl border border-[#E8E4DF] px-3 py-2.5 text-sm bg-white focus:outline-none"
            >
              {TIME_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#8A8580] uppercase tracking-wide mb-1.5 block">End Time</label>
            <select
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className="w-full rounded-xl border border-[#E8E4DF] px-3 py-2.5 text-sm bg-white focus:outline-none"
            >
              {TIME_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Days */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-[#8A8580] uppercase tracking-wide mb-1.5 block">Days</label>
          <div className="flex gap-2 flex-wrap">
            {DAY_OPTIONS.map(({ key, label: dayLabel }) => (
              <button
                key={key}
                onClick={() => toggleDay(key)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${days.includes(key) ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-[#4A5568] border-[#E8E4DF] hover:border-[#1A1A1A]"}`}
              >
                {dayLabel}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="rounded-xl border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300"
          >
            Delete
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !label.trim()}
            className="flex-1 bg-[#1A1A1A] hover:bg-[#333] text-white rounded-xl"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save Changes
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}