import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAI } from "@/lib/plans";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Headphones, Video, Sparkles, Loader2, ArrowRight, Plus, Check } from "lucide-react";

const TYPE_META = {
  book: { label: "Book", icon: BookOpen },
  documentary: { label: "Documentary", icon: Video },
  podcast: { label: "Podcast", icon: Headphones },
};

export default function NextReads({ sources = [], profile, queuedTitles = [], onQueue }) {
  const [pick, setPick] = useState(null);
  const [loading, setLoading] = useState(false);
  const [skipped, setSkipped] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const titles = sources.map((s) => s.title).filter(Boolean);
  const shelfText = queuedTitles.filter(Boolean).join("; ");

  const findNext = async () => {
    setLoading(true);
    setPick(null);
    setSaved(false);

    const libraryText = sources
      .map((s) => {
        const principles = (s.learnings || []).map((l) => l.principle).filter(Boolean).slice(0, 6).join("; ");
        return `- "${s.title}"${s.author ? ` by ${s.author}` : ""} (${s.type})${principles ? ` — principles: ${principles}` : ""}`;
      })
      .join("\n");

    const result = await invokeAI("next_read", {
      prompt: `You are choosing the single next book or documentary for one person, based on what is already in their library.

THEIR LIBRARY:
${libraryText}
${shelfText ? `\nALREADY WAITING ON THEIR SHELF (do not suggest these):\n${shelfText}\n` : ""}
ABOUT THEM:
Growth focus: ${profile?.growth_focus || "not stated"}
Goals: ${(profile?.goals || []).join("; ") || "not stated"}
Already does consistently: ${(profile?.existing_habits || []).join("; ") || "not stated"}

HOW TO CHOOSE — be strict:
- Recommend at most ONE title. One is the expected answer. Return NONE if you cannot think of a specific work that genuinely builds on their library.
- It must be a real, existing, specifically named work by a real named creator. Never invent a title, and never name a vague category.
- It must clearly extend or challenge what they already have — name the exact source in their library it builds on and what gap it closes. "Highly rated" or "a classic" is not a reason.
- Do NOT recommend anything already in their library, or a close duplicate of it.
- A documentary is as welcome as a book — pick whichever actually serves the gap.
- If their library is too thin (fewer than 2 sources) to reason from, return NONE with a short reason rather than guessing.

Return verdict "none" when there is no honest recommendation, "pick" when there is one. Keep reason to one or two sentences spoken plainly to the reader — no hype, no exclamation marks.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          verdict: { type: "string", enum: ["pick", "none"] },
          title: { type: "string" },
          creator: { type: "string" },
          type: { type: "string", enum: ["book", "documentary", "podcast"] },
          reason: { type: "string" },
          builds_on: { type: "string" },
        },
        required: ["verdict", "reason"],
      },
    });

    setLoading(false);
    if (!result) return;
    if (result?.verdict === "pick" && result.title) {
      setPick(result);
      setSkipped((prev) => [...prev, result.title]);
    } else {
      setPick({ verdict: "none", reason: result?.reason || "Nothing in your library points clearly to a next step yet." });
    }
  };

  const meta = pick?.verdict === "pick" ? TYPE_META[pick.type] || TYPE_META.book : null;
  const Icon = meta?.icon || BookOpen;

  const saveToShelf = async () => {
    if (!pick) return;
    setSaving(true);
    await onQueue?.({ ...pick, type: pick.type === "documentary" ? "video" : pick.type });
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="mt-10 pt-6 border-t border-[#E8E4DF]">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-3.5 h-3.5 text-[#B0AAA4]" />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0AAA4]">Next up</p>
      </div>

      <AnimatePresence mode="wait">
        {!pick && !loading && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="text-xs text-[#8A8580] mb-3 leading-relaxed">
              {titles.length >= 2
                ? `One book or documentary that builds on what you already have — chosen from your ${titles.length} sources. It goes to your shelf, not your knowledge base.`
                : "Add a couple more sources and this will point you to something that builds on them."}
            </p>
            {titles.length >= 2 && (
              <button
                onClick={findNext}
                className="flex items-center gap-1.5 text-xs font-medium text-[#4A5568] hover:text-[#3A4250] transition-colors"
              >
                Find my next one <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        )}

        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-2">
            <p className="flex items-center gap-2 text-xs text-[#8A8580]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading your library…
            </p>
          </motion.div>
        )}

        {pick && !loading && (
          <motion.div key="pick" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {pick.verdict === "pick" ? (
              <div className="bg-white rounded-2xl border border-[#E8E4DF] p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E2E8F0] text-[#4A5568] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wide text-[#B0AAA4] font-semibold">{meta.label}</p>
                    <h3 className="font-semibold text-[#1A1A1A] leading-snug">{pick.title}</h3>
                    {pick.creator && <p className="text-xs text-[#8A8580]">{pick.creator}</p>}
                  </div>
                </div>

                <p className="text-xs text-[#4A5568] mt-3 leading-relaxed">{pick.reason}</p>
                {pick.builds_on && (
                  <p className="text-[11px] text-[#B0AAA4] mt-2">Builds on: {pick.builds_on}</p>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={saveToShelf}
                    disabled={saved || saving}
                    className={`flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-medium transition-colors ${
                      saved ? "bg-[#E2E8F0] text-[#4A5568]" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                    }`}
                  >
                    {saved ? (
                      <><Check className="w-3.5 h-3.5" /> On your shelf</>
                    ) : saving ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving</>
                    ) : (
                      <><Plus className="w-3.5 h-3.5" /> Save to my shelf</>
                    )}
                  </button>
                  {!saved && (
                    <button
                      onClick={findNext}
                      className="px-3 h-9 rounded-xl text-xs font-medium text-[#8A8580] hover:bg-[#F5F0EB] transition-colors"
                    >
                      Not this one
                    </button>
                  )}
                </div>
                {saved && (
                  <p className="text-[11px] text-[#8A8580] mt-2 leading-relaxed">
                    Nothing goes into your knowledge base yet — that waits until you've actually been through it.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-xs text-[#8A8580] leading-relaxed">{pick.reason}</p>
                {skipped.length > 0 && (
                  <button
                    onClick={findNext}
                    className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#4A5568] hover:text-[#3A4250] transition-colors"
                  >
                    Try again <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}