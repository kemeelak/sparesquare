import React from "react";
import { X } from "lucide-react";
import { checkExtracted, clockText } from "./checkExtracted";

const HOURS = Array.from({ length: 25 }, (_, i) => i);
const hourOption = (hour) => (hour === 24 ? "12 AM" : clockText(hour));

// What they said they can't move, editable — a misheard block should be fixable here
// rather than something they have to live with on their grid.
export default function UnmovableEditor({ blocks = [], onChange }) {
  const flagged = new Set(checkExtracted({ unmovables: blocks }).map((issue) => issue.index));
  const update = (index, patch) =>
    onChange(blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  const remove = (index) => onChange(blocks.filter((_, i) => i !== index));

  if (blocks.length === 0) {
    return <p className="text-xs text-[#8A8580]">Nothing fixed — your whole day is flexible.</p>;
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        const span = block.end_hour - block.start_hour;
        const needsCheck = flagged.has(index);
        return (
          <div
            key={index}
            className={`rounded-xl border p-2 ${
              needsCheck ? "border-[#D4A574] bg-[#F5EDE4]/50" : "border-[#E8E4DF]"
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                value={block.label || ""}
                onChange={(e) => update(index, { label: e.target.value })}
                className="flex-1 min-w-0 bg-transparent text-sm font-medium text-[#1A1A1A] focus:outline-none"
              />
              <button
                onClick={() => remove(index)}
                aria-label={`Remove ${block.label || "block"}`}
                className="p-1 rounded-lg text-[#B0AAA4] hover:text-red-500 hover:bg-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <select
                value={block.start_hour}
                onChange={(e) => update(index, { start_hour: Number(e.target.value) })}
                className="rounded-lg border border-[#E8E4DF] bg-white px-1.5 py-1 text-xs text-[#1A1A1A] focus:outline-none"
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>{hourOption(hour)}</option>
                ))}
              </select>
              <span className="text-[11px] text-[#8A8580]">to</span>
              <select
                value={block.end_hour}
                onChange={(e) => update(index, { end_hour: Number(e.target.value) })}
                className="rounded-lg border border-[#E8E4DF] bg-white px-1.5 py-1 text-xs text-[#1A1A1A] focus:outline-none"
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>{hourOption(hour)}</option>
                ))}
              </select>
              <span className={`ml-auto text-[11px] ${needsCheck ? "text-[#B07A3C] font-medium" : "text-[#B0AAA4]"}`}>
                {span > 0 ? `${span} hrs` : "check times"}
                {needsCheck ? " · check" : ""}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}