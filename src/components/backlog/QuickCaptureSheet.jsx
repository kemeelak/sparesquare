import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { X, Loader2, Sparkles, Plus } from "lucide-react";
import { invokeAI } from "@/lib/plans";
import { AREA_KEYS, areaOf, bucketSettings } from "@/lib/lifeAreas";

const CATEGORIES = [
  "fitness", "mindfulness", "learning", "nutrition",
  "sleep", "productivity", "social", "creative",
];

const EXAMPLES = ["Call my sister", "Book a dentist", "Read 10 pages"];

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          life_area: { type: "string" },
          duration_minutes: { type: "number" },
          energy_level: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  required: ["items"],
};

export default function QuickCaptureSheet({ profile, onClose }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const buckets = bucketSettings(profile);
  const bucketLine = buckets
    .map((b) => `${b.key}${b.includes.length ? ` (${b.includes.join(", ")})` : ""}`)
    .join(", ");

  const capture = async () => {
    const said = text.trim();
    if (!said || busy) return;
    setBusy(true);

    const res = await invokeAI("quick_capture", {
      model: "gpt_5_mini",
      prompt: `A member typed the thing they want to get done, so it can wait in their backlog until there's a free hour for it:
"""${said}"""

Turn it into one to three concrete backlog items. Title is short and action-shaped, in their words ("Call my sister", "Book a dentist appointment"). description is one short line of context, empty if there's nothing to add.
category is one of: ${CATEGORIES.join(", ")}.
life_area is one of: ${bucketLine}. Pick the bucket it feeds, using what they said belongs in each one.
duration_minutes is a realistic first guess between 5 and 120. energy_level is low, medium or high.
Never invent detail they didn't imply.`,
      response_json_schema: SCHEMA,
    });

    // Out of credits — the upgrade prompt is already up.
    if (!res) {
      setBusy(false);
      return;
    }

    const items = (Array.isArray(res.items) ? res.items : [])
      .filter((item) => item?.title)
      .slice(0, 3);

    if (items.length) {
      await base44.entities.HabitBlock.bulkCreate(
        items.map((item) => ({
          title: String(item.title).slice(0, 120),
          description: (item.description || "").slice(0, 300),
          category: CATEGORIES.includes(item.category) ? item.category : "productivity",
          life_area: AREA_KEYS.includes(item.life_area)
            ? item.life_area
            : areaOf({ title: item.title }, buckets),
          duration_minutes: Math.min(120, Math.max(5, Math.round(Number(item.duration_minutes) || 15))),
          energy_level: ["low", "medium", "high"].includes(item.energy_level) ? item.energy_level : "medium",
          status: "backlog",
        }))
      );
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    }

    setBusy(false);
    onClose();
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
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md p-6"
      >
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Get it out of your head</h2>
            <p className="text-xs text-[#8A8580] mt-0.5">
              Say it however it comes out. It waits in your backlog until there's an hour for it.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB] flex-shrink-0">
            <X className="w-4 h-4 text-[#8A8580]" />
          </button>
        </div>

        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              capture();
            }
          }}
          rows={3}
          maxLength={600}
          placeholder="Call my sister, book a dentist, finally reply to that email…"
          disabled={busy}
          className="w-full mt-4 resize-none rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] px-3.5 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 placeholder:text-[#B0AAA4] disabled:opacity-50"
        />

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              onClick={() => setText(example)}
              disabled={busy}
              className="px-2.5 py-1 rounded-full border border-[#E8E4DF] text-[11px] text-[#8A8580] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors disabled:opacity-40"
            >
              {example}
            </button>
          ))}
        </div>

        <button
          onClick={capture}
          disabled={busy || !text.trim()}
          className="w-full h-12 mt-4 rounded-xl bg-[#1A1A1A] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#333] transition-colors disabled:opacity-30"
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Finding its place…
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Add to backlog
            </>
          )}
        </button>

        <p className="text-[10px] text-[#B0AAA4] mt-2.5 flex items-start gap-1.5 leading-snug">
          <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
          It gets filed under the right bucket and given a realistic length, so scheduling it later is one tap.
        </p>
      </motion.div>
    </motion.div>
  );
}