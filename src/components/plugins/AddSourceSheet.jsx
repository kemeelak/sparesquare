import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { X, BookOpen, Headphones, Video, FileText, Loader2, Sparkles, Link } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const types = [
  { value: "book", label: "Book", icon: BookOpen },
  { value: "podcast", label: "Podcast", icon: Headphones },
  { value: "video", label: "Video", icon: Video },
  { value: "article", label: "Article", icon: FileText },
];

const isYouTubeUrl = (str) => /youtube\.com|youtu\.be/.test(str);

export default function AddSourceSheet({ onClose, onAdded }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("book");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [extractedData, setExtractedData] = useState(null);

  const handleExtract = async () => {
    if (!title.trim()) return;
    setLoading(true);

    let transcriptContext = "";

    // If video type and a YouTube URL is provided, transcribe first
    if (type === "video" && url.trim() && isYouTubeUrl(url)) {
      setLoadingStep("Fetching video transcript...");
      try {
        const res = await base44.functions.invoke("transcribeVideo", { url: url.trim() });
        if (res.data?.transcript) {
          transcriptContext = res.data.transcript.slice(0, 12000);
        }
      } catch (e) {
        console.error("Transcript fetch failed:", e);
      }
    }

    setLoadingStep(transcriptContext ? "Extracting from transcript..." : "Searching the web & extracting...");

    const prompt = transcriptContext
      ? `You are extracting structured knowledge from the video "${title}" to train an AI life coach.

IMPORTANT: Base your extraction ONLY on the actual transcript below. Do NOT invent or assume anything not mentioned in it.

VIDEO TRANSCRIPT:
${transcriptContext}

Extract THREE things from what is actually said in this transcript:

1. SCHEDULABLE HABITS (habits array): Concrete, specific actions with a fixed time. Must be directly mentioned or clearly implied in the transcript. 4-7 habits.

2. PARTNER PRINCIPLES (learnings array): Core ideas, mindset shifts, and frameworks mentioned. 6-10 principles.

3. SUMMARY: One paragraph capturing the video's core message.`
      : `You are extracting structured knowledge from "${title}" (${type}) to train an AI life coach called SpareSquare Partner.

Extract THREE things:

1. SCHEDULABLE HABITS (habits array): Concrete, specific actions that take a fixed amount of time and can literally appear in a calendar. NOT vague values or abstract ideas.

BAD (too vague): "Live below your means", "Practice generosity", "Be disciplined"
GOOD (specific, timed): "Track every expense in a spreadsheet" (weekly, 15min), "Write 3 things you're grateful for" (daily, 5min), "Read 10 pages" (daily, 15min)

Extract 4-7 habits. Include frequency (daily/weekly/monthly) and realistic duration_minutes.

2. PARTNER PRINCIPLES (learnings array): Core ideas, mindset shifts, frameworks — the Partner AI will use these when giving advice. Extract 6-12 principles.

3. SUMMARY: One paragraph capturing the core philosophy.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: !transcriptContext,
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
                frequency: { type: "string" },
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

    setExtractedData({ ...result, usedTranscript: !!transcriptContext });
    setLoading(false);
    setLoadingStep("");
  };

  const handleSave = async (selectedIndices) => {
    const selectedHabits = extractedData.habits.filter((_, i) => selectedIndices.includes(i));
    const sourceName = extractedData.title || title;

    await base44.entities.PluginSource.create({
      title: sourceName,
      type,
      author: extractedData.author || "",
      habits_extracted: selectedHabits,
      learnings: extractedData.learnings || [],
      summary: extractedData.summary || "",
    });

    // Add selected habits to the backlog
    if (selectedHabits.length > 0) {
      await base44.entities.HabitBlock.bulkCreate(
        selectedHabits.map((h) => ({
          title: h.title,
          description: h.description || "",
          source: sourceName,
          duration_minutes: h.duration_minutes || 15,
          energy_level: h.energy_level || "medium",
          category: h.category || "productivity",
          status: "backlog",
        }))
      );
    }

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

          {!extractedData ? (
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
                placeholder={`${type === "video" ? "Video title" : type === "book" ? "Book title (e.g. Atomic Habits)" : type === "podcast" ? "Podcast episode name" : "Article title"}`}
                className="mb-3 h-12 rounded-xl border-[#E8E4DF]"
                onKeyDown={(e) => e.key === "Enter" && handleExtract()}
              />

              {/* YouTube URL field — only for video */}
              {type === "video" && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 bg-[#F5F0EB] rounded-xl px-3 h-12 border border-[#E8E4DF]">
                    <Link className="w-4 h-4 text-[#8A8580] shrink-0" />
                    <input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="YouTube URL (optional — enables real transcript)"
                      className="flex-1 bg-transparent text-sm outline-none text-[#1A1A1A] placeholder:text-[#B0AAA4]"
                    />
                  </div>
                  {url && isYouTubeUrl(url) && (
                    <p className="text-[11px] text-[#7C9A82] mt-1 ml-1">✓ Will transcribe from actual video</p>
                  )}
                  {url && !isYouTubeUrl(url) && (
                    <p className="text-[11px] text-[#D4A574] mt-1 ml-1">Only YouTube URLs are supported for transcription</p>
                  )}
                </div>
              )}

              <Button
                onClick={handleExtract}
                disabled={!title.trim() || loading}
                className="w-full h-12 rounded-xl bg-[#1A1A1A] hover:bg-[#333] text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {loadingStep || "Processing..."}
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
              habits={extractedData.habits || []}
              learnings={extractedData.learnings || []}
              summary={extractedData.summary}
              sourceName={extractedData.title || title}
              author={extractedData.author}
              usedTranscript={extractedData.usedTranscript}
              onSave={handleSave}
              onBack={() => setExtractedData(null)}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function HabitSelector({ habits, learnings, summary, sourceName, author, usedTranscript, onSave, onBack }) {
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
      {author && <p className="text-xs text-[#B0AAA4] mb-1">by {author}</p>}
      {usedTranscript && (
        <p className="text-[11px] text-[#7C9A82] mb-3">✓ Extracted from real transcript</p>
      )}

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