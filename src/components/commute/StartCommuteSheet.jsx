import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { COMMUTE_MODES } from "@/lib/commute";

const PRESETS = [15, 30, 45, 60, 90];

export default function StartCommuteSheet({ defaultMode, onStart, onClose, isStarting }) {
  const [mode, setMode] = useState(defaultMode || "transit");
  const [preset, setPreset] = useState(30);
  const [custom, setCustom] = useState("");

  const minutes = custom ? Number(custom) : preset;
  const canStart = minutes >= 5 && minutes <= 600;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center"
    >
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Start a commute</h2>
            <p className="text-xs text-[#8A8580] mt-0.5">
              Leaving at an odd hour is fine — this only marks your ride now.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB] text-[#8A8580]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0AAA4] mb-2">
          How are you getting there?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(COMMUTE_MODES).map(([value, meta]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`p-3 rounded-2xl border text-left transition-colors ${
                mode === value ? "border-[#1A1A1A] bg-[#F5F0EB]" : "border-[#E8E4DF] hover:bg-[#FAF8F5]"
              }`}
            >
              <span className="text-xl">{meta.emoji}</span>
              <p className="text-xs font-semibold text-[#1A1A1A] mt-1.5">{meta.label}</p>
            </button>
          ))}
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0AAA4] mt-5 mb-2">
          How long does it take?
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => {
                setPreset(m);
                setCustom("");
              }}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                !custom && preset === m
                  ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                  : "bg-white text-[#4A5568] border-[#E8E4DF] hover:bg-[#F5F0EB]"
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <input
            type="number"
            inputMode="numeric"
            min={5}
            max={600}
            placeholder="Or exact minutes"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="flex-1 h-11 rounded-xl border border-[#E8E4DF] px-3 text-base text-[#1A1A1A] placeholder:text-[#B0AAA4]"
          />
          <span className="text-xs text-[#8A8580]">minutes</span>
        </div>

        <button
          onClick={() => onStart({ minutes, mode })}
          disabled={!canStart || isStarting}
          className="w-full h-12 rounded-xl bg-[#1A1A1A] text-white text-sm font-semibold mt-6 disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {isStarting && <Loader2 className="w-4 h-4 animate-spin" />}
          {canStart ? `Start — ${minutes} min` : "Pick a length"}
        </button>
      </motion.div>
    </motion.div>
  );
}