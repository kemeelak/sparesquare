import React from "react";
import { Check, Target, Flame } from "lucide-react";
import { createPageUrl } from "../../utils";

export default function StatsRow({ completed, total, streak, onClickCompleted, onClickScheduled }) {
  const items = [
    { label: "Completed", value: completed, icon: Check, color: "text-[#7C9A82] bg-[#E8F0EA]", onClick: onClickCompleted },
    { label: "Scheduled", value: total, icon: Target, color: "text-[#4A5568] bg-[#E2E8F0]", onClick: onClickScheduled },
    { label: "Streak", value: `${streak}d`, icon: Flame, color: "text-[#D4A574] bg-[#F5EDE4]", onClick: () => window.location.href = createPageUrl("Progress") },
  ];

  return (
    <div className="flex gap-3">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className="flex-1 bg-white rounded-xl p-3 border border-[#E8E4DF] flex flex-col items-center text-center hover:border-[#1A1A1A]/20 hover:shadow-sm transition-all active:scale-95"
        >
          <div className={`w-6 h-6 rounded-lg ${item.color} flex items-center justify-center mb-1`}>
            <item.icon className="w-3.5 h-3.5" />
          </div>
          <p className="text-lg font-bold text-[#1A1A1A]">{item.value}</p>
          <p className="text-[10px] text-[#8A8580] font-medium">{item.label}</p>
        </button>
      ))}
    </div>
  );
}