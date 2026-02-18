import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { X, BookOpen, Headphones, Video, FileText, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const types = [
  { value: "book", label: "Book", icon: BookOpen },
  { value: "podcast", label: "Podcast", icon: Headphones },
  { value: "video", label: "Video", icon: Video },
  { value: "article", label: "Article", icon: FileText },
];

export default function AddSourceSheet({ onClose, onAdded }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("book");
  const [loading, setLoading] = useState(false);
  const [extractedHabits, setExtractedHabits] = useState(null);

  const handleSearch = async () => {
    if (!title.trim()) return;
    setLoading(true);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are extracting structured knowledge from "${title}" (${type}) to train an AI life coach.

Do TWO things:

1. HABITS: Extract specific, actionable habits or daily protocols from this source that a person can schedule (e.g. "10-min cold shower", "zero-based budget review weekly").

2. LEARNINGS: Extract the core principles, philosophies, frameworks, and methodologies the author teaches. These are NOT habits — they are IDEAS the coach should KNOW and APPLY when advising users. For example, from Dave Ramsey: "Baby Steps (pay off debt smallest to largest)", "Avoid debt at all costs", "Emergency fund before investing". From Atomic Habits: "Identity-based change", "Habit stacking", "Make it obvious/attractive/easy/satisfying". Be thorough — extract 8-15 learnings.

3. SUMMARY: A one-paragraph summary of the core philosophy of this source.

Return all this as structured JSON.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          author: { type: "string" },
          summary: { type: "string" },
          habits: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                duration_minutes: { type: "number" },
                energy_level: { type: "string", enum: ["low", "medium", "high"] },
                category: { type: "string", enum: ["fitness", "mindfulness", "learning", "nutrition", "sleep", "productivity", "social", "creative"] }
              }
            }
          },
          learnings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                principle: { type: "string" },
                explanation: { type: "string" },
                domain: { type: "string" }
              }
            }
          }
        }
      }
    });

    setExtractedHabits(result);
    setLoading(false);
  };

  const handleSave = async (selectedIndices) => {
    const selectedHabits = extractedHabits.habits.filter((_, i) => selectedIndices.includes(i));
    await base44.entities.PluginSource.create({
      title: extractedHabits.title || title,
      type,
      author: extractedHabits.author || "",
      habits_extracted: selectedHabits,
      learnings: extractedHabits.learnings || [],
      summary: extractedHabits.summary || "",
    });
    onAdded();
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
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#1A1A1A]">Add Source</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB]">
              <X className="w-5 h-5 text-[#8A8580]" />
            </button>
          </div>

          {!extractedHabits ? (
            <>
              {/* Type selector */}
              <div className="flex gap-2 mb-4">
                {types.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all
                      ${type === t.value ? "bg-[#1A1A1A] text-white" : "bg-[#F5F0EB] text-[#8A8580] hover:bg-[#E8E4DF]"}`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Title input */}
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Enter ${type} name (e.g., "Atomic Habits")`}
                className="mb-4 h-12 rounded-xl border-[#E8E4DF]"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />

              <Button
                onClick={handleSearch}
                disabled={!title.trim() || loading}
                className="w-full h-12 rounded-xl bg-[#1A1A1A] hover:bg-[#333] text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching & Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> Extract Habits
                  </>
                )}
              </Button>
            </>
          ) : (
            <HabitSelector
              habits={extractedHabits.habits || []}
              sourceName={extractedHabits.title || title}
              author={extractedHabits.author}
              onSave={handleSave}
              onBack={() => setExtractedHabits(null)}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function HabitSelector({ habits, learnings, summary, sourceName, author, onSave, onBack }) {
  const [selected, setSelected] = useState(habits.map((_, i) => i));
  const [saving, setSaving] = useState(false);

  const toggle = (i) => {
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(selected);
    setSaving(false);
  };

  return (
    <div>
      <p className="text-sm text-[#8A8580] mb-1">Found from <span className="font-semibold text-[#1A1A1A]">{sourceName}</span></p>
      {author && <p className="text-xs text-[#B0AAA4] mb-3">by {author}</p>}

      {/* Learnings preview */}
      {learnings?.length > 0 && (
        <div className="bg-[#F5EDE4] rounded-2xl p-4 mb-5 border border-[#E8D5C0]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">🧠</span>
            <p className="text-xs font-semibold text-[#D4A574] uppercase tracking-wide">Partner will learn {learnings.length} principles</p>
          </div>
          {summary && <p className="text-xs text-[#8A8580] mb-2 italic">"{summary}"</p>}
          <div className="flex flex-wrap gap-1.5">
            {learnings.slice(0, 6).map((l, i) => (
              <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-white/80 text-[#4A5568] border border-[#E8D5C0]">
                {l.principle}
              </span>
            ))}
            {learnings.length > 6 && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-white/80 text-[#8A8580]">+{learnings.length - 6} more</span>
            )}
          </div>
        </div>
      )}

      <p className="text-sm font-medium text-[#1A1A1A] mb-3">
        Select habits to add ({selected.length}/{habits.length}):
      </p>

      <div className="space-y-2 mb-6">
        {habits.map((habit, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={`w-full text-left p-3 rounded-xl border-2 transition-all
              ${selected.includes(i)
                ? "border-[#7C9A82] bg-[#E8F0EA]"
                : "border-[#E8E4DF] bg-white"
              }`}
          >
            <p className="text-sm font-medium text-[#1A1A1A]">{habit.title}</p>
            <p className="text-xs text-[#8A8580] mt-0.5">{habit.description}</p>
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#8A8580]">
                {habit.duration_minutes || 15}min
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#8A8580]">
                {habit.energy_level || "medium"} energy
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="rounded-xl flex-1">
          Back
        </Button>
        <Button
          onClick={handleSave}
          disabled={selected.length === 0 || saving}
          className="rounded-xl flex-1 bg-[#7C9A82] hover:bg-[#6B8A71] text-white"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Add ${selected.length} Habits`}
        </Button>
      </div>
    </div>
  );
}