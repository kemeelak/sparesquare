import React, { useState } from "react";

const MOODS = [
  { score: 1, label: "Drained" },
  { score: 2, label: "Low" },
  { score: 3, label: "Steady" },
  { score: 4, label: "Good" },
  { score: 5, label: "Charged" },
];

export default function MoodStrip({ mood, onSelect, isSaving }) {
  const [picking, setPicking] = useState(!mood);

  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DF] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[#1A1A1A]">
          {mood && !picking ? `Today you're ${mood.label.toLowerCase()}` : "Where are you today?"}
        </p>
        {mood && !picking && (
          <button
            onClick={() => setPicking(true)}
            className="text-[11px] text-[#8A8580] underline underline-offset-2"
          >
            Change
          </button>
        )}
      </div>

      {picking && (
        <>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {MOODS.map((m) => (
              <button
                key={m.score}
                disabled={isSaving}
                onClick={() => {
                  onSelect(m);
                  setPicking(false);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                  mood?.score === m.score
                    ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                    : "bg-white text-[#4A5568] border-[#E8E4DF] hover:bg-[#F5F0EB]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#B0AAA4] mt-2">
            Only used to shape what we suggest — lighter days get lighter ideas.
          </p>
        </>
      )}
    </div>
  );
}