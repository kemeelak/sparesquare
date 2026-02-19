import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw } from "lucide-react";

const CATEGORIES = [
  { value: "fitness", emoji: "💪" },
  { value: "mindfulness", emoji: "🧘" },
  { value: "learning", emoji: "📚" },
  { value: "nutrition", emoji: "🥗" },
  { value: "sleep", emoji: "😴" },
  { value: "productivity", emoji: "⚡" },
  { value: "social", emoji: "❤️" },
  { value: "creative", emoji: "🎨" },
];

const ENERGY_LEVELS = ["low", "medium", "high"];

const PRESET_REPEATS = [
  { value: "none", label: "No repeat" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
];

const DAY_OPTIONS = [
  { value: "mon", label: "M" },
  { value: "tue", label: "T" },
  { value: "wed", label: "W" },
  { value: "thu", label: "T" },
  { value: "fri", label: "F" },
  { value: "sat", label: "S" },
  { value: "sun", label: "S" },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export default function AddEventForm({ hour, dateStr, onSave, onCancel, isPending }) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(60);
  const [category, setCategory] = useState("productivity");
  const [energy, setEnergy] = useState("medium");
  const [repeat, setRepeat] = useState("none");
  const [selectedDays, setSelectedDays] = useState([]);

  const toggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
    setRepeat("custom_days");
  };

  const handlePresetRepeat = (val) => {
    setRepeat(val);
    setSelectedDays([]);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const finalRepeat = repeat === "custom_days" && selectedDays.length > 0
      ? selectedDays
      : repeat;
    onSave({ title: title.trim(), duration, category, energy, repeat: finalRepeat });
  };

  return (
    <div className="bg-[#F5F0EB] rounded-2xl p-4 mb-4 space-y-4">
      <p className="text-sm font-semibold text-[#1A1A1A]">New Event / Habit</p>

      {/* Title */}
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        placeholder="What do you want to do?"
        className="w-full rounded-xl border border-[#E8E4DF] bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10"
      />

      {/* Duration */}
      <div>
        <p className="text-xs text-[#8A8580] mb-1.5">Duration</p>
        <div className="flex flex-wrap gap-1.5">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                duration === d ? "bg-[#1A1A1A] text-white" : "bg-white border border-[#E8E4DF] text-[#4A5568] hover:border-[#1A1A1A]"
              }`}
            >
              {d < 60 ? `${d}m` : d === 60 ? "1h" : `${d / 60}h`}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <p className="text-xs text-[#8A8580] mb-1.5">Category</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              title={c.value}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                category === c.value ? "bg-[#1A1A1A] text-white" : "bg-white border border-[#E8E4DF] text-[#4A5568] hover:border-[#1A1A1A]"
              }`}
            >
              <span>{c.emoji}</span>
              <span className="capitalize">{c.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Energy Level */}
      <div>
        <p className="text-xs text-[#8A8580] mb-1.5">Energy needed</p>
        <div className="flex gap-1.5">
          {ENERGY_LEVELS.map((e) => (
            <button
              key={e}
              onClick={() => setEnergy(e)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all flex-1 ${
                energy === e ? "bg-[#1A1A1A] text-white" : "bg-white border border-[#E8E4DF] text-[#4A5568] hover:border-[#1A1A1A]"
              }`}
            >
              {e === "low" ? "🟢 Low" : e === "medium" ? "🟡 Med" : "🔴 High"}
            </button>
          ))}
        </div>
      </div>

      {/* Repeat */}
      <div>
        <p className="text-xs text-[#8A8580] mb-1.5 flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> Repeat
        </p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESET_REPEATS.map((r) => (
            <button
              key={r.value}
              onClick={() => handlePresetRepeat(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                repeat === r.value ? "bg-[#7C9A82] text-white" : "bg-white border border-[#E8E4DF] text-[#4A5568] hover:border-[#7C9A82]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#B0AAA4] mb-1.5">Or pick specific days</p>
        <div className="flex gap-1.5">
          {DAY_OPTIONS.map((d, i) => {
            const dayLabels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
            const isSelected = selectedDays.includes(d.value);
            return (
              <button
                key={d.value}
                onClick={() => toggleDay(d.value)}
                title={dayLabels[i]}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isSelected ? "bg-[#7C9A82] text-white" : "bg-white border border-[#E8E4DF] text-[#4A5568] hover:border-[#7C9A82]"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl text-sm border-[#E8E4DF]">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!title.trim() || isPending}
          className="flex-1 bg-[#1A1A1A] hover:bg-[#333] text-white rounded-xl text-sm"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}