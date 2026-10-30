import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { X, ExternalLink, Loader2, Plus, Check, RefreshCw } from "lucide-react";
import {
  commuteMode,
  minutesLeftInCommute,
  contentLink,
  habitFitsCommute,
  consumptionLabel,
} from "@/lib/commute";

const KIND_META = {
  listen: { emoji: "🎧", label: "Listen", category: "learning" },
  watch: { emoji: "📺", label: "Watch", category: "learning" },
  read: { emoji: "📖", label: "Read", category: "learning" },
  do: { emoji: "🎯", label: "Do it", category: "productivity" },
};

export default function CommuteSheet({
  commute,
  date,
  hour,
  profile,
  habits,
  onClose,
  onQueue,
  onQueueBacklog,
  onComplete,
}) {
  const mode = commuteMode(commute);
  const dateStr = format(date, "yyyy-MM-dd");
  const minutes = minutesLeftInCommute(commute, hour);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const scheduled = (habits || []).filter(
    (h) => h.scheduled_date === dateStr && h.scheduled_hour === hour && h.status !== "backlog"
  );
  const backlog = (habits || [])
    .filter((h) => h.status === "backlog" && habitFitsCommute(h, commute.mode))
    .slice(0, 3);

  const fetchSuggestions = async () => {
    setLoading(true);
    setFailed(false);
    const allowed = mode.canRead
      ? "listening, watching, reading, or a voice-only action"
      : "listening or a voice-only action ONLY — their eyes and hands are busy, so never suggest reading or watching";

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        model: "gemini_3_flash",
        add_context_from_internet: true,
        prompt: `Someone wants to use their commute as growth time. Suggest what they could do in the next ${minutes} minutes.

Their commute: ${mode.label}, about ${minutes} minutes left.
They normally consume content via: ${consumptionLabel(commute)}.
They can do: ${allowed}.
Content topics they enjoy: ${(commute.topics || []).join(", ") || "no preference"}.
Their growth focus: ${profile?.growth_focus || "not set"}.
Their goals: ${(profile?.goals || []).join("; ") || "not set"}.
They ALREADY do these consistently, never suggest them back: ${(profile?.existing_habits || []).join("; ") || "none recorded"}.

Give 4 suggestions:
- 2 of them should be real, currently existing podcasts, episodes, YouTube channels or videos that genuinely match their topics and fit the length. Be accurate — if unsure of an exact episode, name the show/channel and give a search query instead.
- 1 should be something they can DO using only their voice or ears, tied to their goals (e.g. call someone, voice-memo an idea, rehearse something out loud, a breathing exercise).
- 1 wildcard that is genuinely interesting but on-topic.

For every suggestion give: a short title; kind (listen/watch/read/do); minutes as a number that fits in ${minutes}; why — one specific sentence explaining why it suits THIS person on THIS ride; search_query — the exact words to paste into a search box to find it; platform (youtube/spotify/podcast/none; use none for do).`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  kind: { type: "string", enum: ["listen", "watch", "read", "do"] },
                  minutes: { type: "number" },
                  why: { type: "string" },
                  search_query: { type: "string" },
                  platform: { type: "string", enum: ["youtube", "spotify", "podcast", "none"] },
                },
                required: ["title", "kind", "why"],
              },
            },
          },
          required: ["suggestions"],
        },
      });
      setSuggestions(res?.suggestions || []);
    } catch (e) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

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
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="p-5 border-b border-[#F0EDE8] flex items-start justify-between sticky top-0 bg-white rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E9F1F0] flex items-center justify-center text-lg">
              {mode.emoji}
            </div>
            <div>
              <p className="font-bold text-[#1A1A1A] text-sm">Commuting · {mode.label}</p>
              <p className="text-xs text-[#8A8580]">{minutes} minutes to use</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB] text-[#8A8580]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {scheduled.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0AAA4] mb-2">
                Queued for this ride
              </p>
              <div className="space-y-2">
                {scheduled.map((habit) => (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between gap-3 bg-[#F5F0EB] rounded-xl px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{habit.title}</p>
                      <p className="text-xs text-[#8A8580]">
                        {habit.duration_minutes ? `${habit.duration_minutes} min` : "This ride"}
                      </p>
                    </div>
                    {habit.status === "completed" ? (
                      <span className="text-xs font-semibold text-[#7C9A82] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Done
                      </span>
                    ) : (
                      <button
                        onClick={() => onComplete(habit)}
                        className="px-3 py-1.5 rounded-lg bg-[#1A1A1A] text-white text-xs font-semibold flex-shrink-0"
                      >
                        Did it
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {backlog.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0AAA4] mb-2">
                From your backlog
              </p>
              <div className="space-y-2">
                {backlog.map((habit) => (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between gap-3 border border-[#E8E4DF] rounded-xl px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{habit.title}</p>
                      <p className="text-xs text-[#8A8580]">
                        {habit.duration_minutes ? `${habit.duration_minutes} min` : habit.category}
                      </p>
                    </div>
                    <button
                      onClick={() => onQueueBacklog(habit)}
                      className="px-3 py-1.5 rounded-lg border border-[#1A1A1A] text-[#1A1A1A] text-xs font-semibold flex-shrink-0"
                    >
                      Slot in
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0AAA4]">
                Ideas for this ride
              </p>
              {!loading && (
                <button
                  onClick={fetchSuggestions}
                  className="p-1 rounded-lg text-[#B0AAA4] hover:bg-[#F5F0EB]"
                  aria-label="Refresh ideas"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {loading && (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-2xl border border-[#E8E4DF] p-4 animate-pulse">
                    <div className="h-3 bg-[#F0EDE8] rounded w-2/3 mb-2" />
                    <div className="h-2.5 bg-[#F5F0EB] rounded w-full mb-1.5" />
                    <div className="h-2.5 bg-[#F5F0EB] rounded w-4/5" />
                  </div>
                ))}
                <p className="text-xs text-[#B0AAA4] flex items-center gap-1.5 pt-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Finding things that fit {minutes} minutes
                </p>
              </div>
            )}

            {!loading && failed && (
              <div className="rounded-2xl border border-[#E8E4DF] p-4 text-center">
                <p className="text-xs text-[#8A8580] mb-2">Couldn't pull ideas just now.</p>
                <button
                  onClick={fetchSuggestions}
                  className="text-xs font-semibold text-[#1A1A1A] underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !failed && (
              <div className="space-y-2">
                {suggestions.map((s, i) => {
                  const meta = KIND_META[s.kind] || KIND_META.listen;
                  const link = contentLink(s.platform, s.search_query);
                  return (
                    <div key={i} className="rounded-2xl border border-[#E8E4DF] p-4">
                      <div className="flex items-start gap-2.5">
                        <span className="text-base leading-none mt-0.5">{meta.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#1A1A1A] leading-snug">{s.title}</p>
                          <p className="text-[11px] text-[#B0AAA4] mt-0.5">
                            {meta.label}
                            {s.minutes ? ` · ${s.minutes} min` : ""}
                          </p>
                          <p className="text-xs text-[#8A8580] mt-1.5 leading-relaxed">{s.why}</p>
                          <div className="flex gap-2 mt-3">
                            {link && (
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E4DF] text-xs font-semibold text-[#1A1A1A] hover:bg-[#F5F0EB]"
                              >
                                Open <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <button
                              onClick={() =>
                                onQueue({
                                  title: s.title,
                                  minutes: s.minutes || minutes,
                                  category: meta.category,
                                  emoji: meta.emoji,
                                })
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] text-white text-xs font-semibold"
                            >
                              <Plus className="w-3 h-3" /> Add to grid
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {suggestions.length === 0 && (
                  <p className="text-xs text-[#8A8580] text-center py-4">
                    No ideas came back — try again in a moment.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}