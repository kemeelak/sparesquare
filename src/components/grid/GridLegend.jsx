import React from "react";
import { Lock, Sparkles, Leaf, Moon } from "lucide-react";

const items = [
  { label: "Unmovable", color: "bg-[#4A5568]", icon: Lock },
  { label: "Habit", color: "bg-[#7C9A82]", icon: Leaf },
  { label: "Spare", color: "bg-[#F5EDE4] border border-dashed border-[#D4A574]", icon: Sparkles },
  { label: "Sleep", color: "bg-[#2D3748]", icon: Moon },
];

export default function GridLegend() {
  return (
    <div className="flex flex-wrap gap-4 py-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-md ${item.color} flex items-center justify-center`}>
            <item.icon className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-medium text-[#8A8580]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}