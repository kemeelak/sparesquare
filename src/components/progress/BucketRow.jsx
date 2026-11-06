import React, { useState } from "react";
import { ChevronUp, ChevronDown, Eye, EyeOff, X, Plus } from "lucide-react";
import EmojiPicker from "@/components/shared/EmojiPicker";

export default function BucketRow({ bucket, rank, isFirst, isLast, onChange, onMove }) {
  const [draft, setDraft] = useState("");
  const hidden = bucket.hidden === true;

  const addInclude = () => {
    const phrase = draft.trim();
    if (!phrase) return;
    if (!bucket.includes.includes(phrase)) onChange({ includes: [...bucket.includes, phrase] });
    setDraft("");
  };

  return (
    <div
      className={`rounded-2xl border p-3 transition-colors ${
        hidden ? "border-[#F0EDE9] bg-[#FAF8F5]" : "border-[#E8E4DF] bg-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
          style={{ backgroundColor: bucket.tint }}
        >
          {bucket.emoji}
        </span>
        <input
          value={bucket.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder={bucket.short}
          maxLength={24}
          className={`flex-1 min-w-0 bg-transparent text-sm font-medium focus:outline-none ${
            hidden ? "text-[#B0AAA4]" : "text-[#1A1A1A]"
          }`}
        />
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => onMove(-1)}
            disabled={isFirst}
            aria-label="More important"
            className="p-1 rounded-lg text-[#8A8580] hover:bg-[#F5F0EB] disabled:opacity-20"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={isLast}
            aria-label="Less important"
            className="p-1 rounded-lg text-[#8A8580] hover:bg-[#F5F0EB] disabled:opacity-20"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChange({ hidden: !hidden })}
            aria-label={hidden ? "Show this bucket" : "Hide this bucket"}
            className={`p-1 rounded-lg hover:bg-[#F5F0EB] ${hidden ? "text-[#B0AAA4]" : "text-[#4A5568]"}`}
          >
            {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 pl-9">
        <span className="text-[10px] font-semibold tabular-nums text-[#B0AAA4] flex-shrink-0">
          #{rank}
        </span>
        <EmojiPicker value={bucket.emoji} onChange={(emoji) => onChange({ emoji })} />
      </div>

      <div className="pl-9 mt-2">
        <p className="text-[10px] uppercase tracking-wide font-semibold text-[#B0AAA4] mb-1.5">
          What belongs here
        </p>
        <div className="flex flex-wrap gap-1.5">
          {bucket.includes.map((phrase) => (
            <span
              key={phrase}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[11px]"
              style={{ backgroundColor: bucket.tint, color: bucket.color }}
            >
              {phrase}
              <button
                onClick={() => onChange({ includes: bucket.includes.filter((p) => p !== phrase) })}
                aria-label={`Remove ${phrase}`}
                className="p-0.5 rounded-full hover:bg-white/60"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addInclude();
              }
            }}
            placeholder="add a thing, e.g. mum, dentist, laundry"
            maxLength={30}
            className="flex-1 min-w-0 bg-transparent text-[12px] text-[#1A1A1A] placeholder:text-[#B0AAA4] focus:outline-none border-b border-[#E8E4DF] pb-1"
          />
          <button
            onClick={addInclude}
            disabled={!draft.trim()}
            aria-label="Add"
            className="p-1 rounded-lg text-[#8A8580] hover:bg-[#F5F0EB] disabled:opacity-25"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}