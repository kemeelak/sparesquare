import React from "react";
import { Lock, Sparkles, Moon, Car } from "lucide-react";
import { LIFE_AREAS } from "@/lib/lifeAreas";

const items = [
  { label: "Unmovable", color: "bg-[#4A5568]", icon: Lock },
  { label: "Commute", color: "bg-[#4A5568]", icon: Car },
  { label: "Spare", color: "bg-[#F5EDE4] border border-dashed border-[#D4A574]", icon: Sparkles },
  { label: "Sleep", color: "bg-[#2D3748]", icon: Moon },
];

export default function GridLegend() {
  return (
    <div className="flex items-center gap-2 lg:gap-4 py-2 lg:py-3 overflow-x-auto scrollbar-hide flex-shrink-0">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 flex-shrink-0">
          <div className={`w-4 h-4 lg:w-5 lg:h-5 rounded-md ${item.color} flex items-center justify-center`}>
            <item.icon className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white" />
          </div>
          <span className="text-[10px] lg:text-xs font-medium text-[#8A8580] whitespace-nowrap">
            {item.label}
          </span>
        </div>
      ))}

      {/* Habit squares take their bucket's colour */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="flex items-center gap-0.5">
          {LIFE_AREAS.map((area) => (
            <div
              key={area.key}
              title={area.label}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: area.color }}
            />
          ))}
        </div>
        <span className="text-[10px] lg:text-xs font-medium text-[#8A8580] whitespace-nowrap">
          Buckets
        </span>
      </div>
    </div>
  );
}