import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "../utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Loader2, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import OnboardingChat from "@/components/onboarding/OnboardingChat";

const GROWTH_LABELS = {
  fitness: "💪 Fitness & Health",
  business: "💼 Business",
  peace: "🧘 Inner Peace",
  learning: "📚 Learning",
  creativity: "🎨 Creativity",
  relationships: "❤️ Relationships",
};
const RHYTHM_LABELS = {
  nine_to_five: "9-to-5 Worker",
  student: "Student",
  night_shift: "Night Shift",
  freelancer: "Freelancer",
  parent: "Parent",
  other: "Other",
};

function toTimeStr(h) {
  const hr = ((h % 24) + 24) % 24;
  if (hr === 0) return "12:00 AM";
  if (hr === 12) return "12:00 PM";
  return hr < 12 ? `${hr}:00 AM` : `${hr - 12}:00 PM`;
}

export default function Onboarding() {
  const [phase, setPhase] = useState("welcome"); // welcome | chat | confirm | building
  const [extracted, setExtracted] = useState({});
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase]);

  const startChat = () => setPhase("chat");

  const handleChatComplete = (data) => {
    setExtracted(data);
    setDraft({
      username: (data.username || "").replace(/[^a-z0-9_]/gi, "").toLowerCase(),
      partner_name: data.partner_name || "Partner",
      goals: (data.goals || []).join("\n"),
      challenges: (data.challenges || []).join("\n"),
      motivation: data.motivation || "",
    });
    setPhase("confirm");
  };

  const handleConfirm = async () => {
    setSaving(true);
    const username = (draft.username || "").replace(/[^a-z0-9_]/gi, "").toLowerCase();

    const profileSummary = {
      rhythm: RHYTHM_LABELS[extracted.rhythm_type] || "other",
      growth: GROWTH_LABELS[extracted.growth_focus] || "learning",
      sleep: `${toTimeStr(extracted.sleep_hour ?? 23)} → wake ${toTimeStr(extracted.wake_hour ?? 7)}`,
      goals: draft.goals,
      challenges: draft.challenges,
      motivation: draft.motivation,
    };

    const backlogSuggestions = await base44.integrations.Core.InvokeLLM({
      prompt: `Based on this user's onboarding profile, suggest 5 highly personalized habit blocks for their backlog. These should be specific, actionable, and deeply relevant to their life situation and goals.

User profile:
${Object.entries(profileSummary).map(([k, v]) => `${k}: ${v}`).join("\n")}

Return 5 habits as JSON with fields: title, description, duration_minutes (15-60), energy_level (low/medium/high), category (fitness/mindfulness/learning/nutrition/sleep/productivity/social/creative).`,
      response_json_schema: {
        type: "object",
        properties: {
          habits: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                duration_minutes: { type: "number" },
                energy_level: { type: "string" },
                category: { type: "string" },
              },
            },
          },
        },
      },
    });

    const me = await base44.auth.me();
    if (me && username) {
      const existingPub = await base44.entities.UserPublicProfile.filter({ created_by_id: me.id });
      if (existingPub.length > 0) {
        await base44.entities.UserPublicProfile.update(existingPub[0].id, {
          username,
          display_name: me.full_name || username,
          user_id: me.id,
        });
      } else {
        await base44.entities.UserPublicProfile.create({
          user_id: me.id,
          username,
          display_name: me.full_name || username,
          current_streak: 0,
          total_completed: 0,
        });
      }
    }

    const sleepH = extracted.sleep_hour ?? 23;
    const wakeH = extracted.wake_hour ?? 7;
    const goalH = extracted.sleep_goal_hour ?? sleepH;

    await base44.entities.UserProfile.create({
      rhythm_type: extracted.rhythm_type || "other",
      unmovables: extracted.unmovables || [],
      sleep_actual: toTimeStr(sleepH),
      sleep_goal: toTimeStr(goalH),
      wake_time: toTimeStr(wakeH),
      growth_focus: extracted.growth_focus || "learning",
      onboarding_complete: true,
      timezone_offset: new Date().getTimezoneOffset() / -60,
      partner_name: draft.partner_name || "Partner",
      goals: draft.goals.split("\n").map((g) => g.trim()).filter(Boolean),
      challenges: draft.challenges.split("\n").map((c) => c.trim()).filter(Boolean),
      motivation: draft.motivation.trim(),
    });

    if (backlogSuggestions?.habits?.length > 0) {
      await base44.entities.HabitBlock.bulkCreate(
        backlogSuggestions.habits.map((h) => ({
          title: h.title,
          description: h.description,
          duration_minutes: h.duration_minutes || 20,
          energy_level: h.energy_level || "medium",
          category: h.category || "productivity",
          status: "backlog",
          source: "SpareSquare AI",
        }))
      );
    }

    window.location.href = createPageUrl("Home");
  };

  const unmovables = extracted.unmovables || [];
  const sleepH = extracted.sleep_hour ?? 23;
  const wakeH = extracted.wake_hour ?? 7;
  const goalH = extracted.sleep_goal_hour ?? sleepH;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 pt-8 pb-8" ref={containerRef}>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mx-auto mb-2">
            <span className="text-white font-bold text-lg">S²</span>
          </div>
          <h1 className="text-lg font-bold text-[#1A1A1A] tracking-tight">Welcome to SpareSquare</h1>
          <p className="text-xs text-[#8A8580] mt-0.5">Let's map your day and find your growth windows</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* WELCOME */}
          {phase === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl border border-[#E8E4DF] p-6 shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#F5EDE4] flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-6 h-6 text-[#D4A574]" />
              </div>
              <h2 className="text-base font-bold text-[#1A1A1A] text-center mb-2">Let's get to know you</h2>
              <p className="text-sm text-[#8A8580] text-center mb-5 leading-relaxed">
                Instead of a boring form, we'll have a quick conversation about your life, your goals, and what's stopped you before. The more I understand your <span className="text-[#1A1A1A] font-medium">why</span>, the better I can coach you.
              </p>
              <div className="space-y-2 mb-6">
                {[
                  "Your daily rhythm & hidden time",
                  "What you're working toward",
                  "What's blocked you before — and why it matters now",
                ].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm text-[#4A5568]">
                    <Check className="w-4 h-4 text-[#7C9A82] flex-shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
              <Button
                onClick={startChat}
                className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white rounded-xl h-12"
              >
                Start the conversation <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="text-xs text-[#B0AAA4] text-center mt-3">Takes about 2-3 minutes</p>
            </motion.div>
          )}

          {/* CHAT — fixed full-screen container so the soft keyboard never distorts the page */}
          {phase === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 z-50 flex flex-col bg-[#FAF8F5] px-4 pt-5"
              style={{ height: "100dvh" }}
            >
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <Sparkles className="w-3.5 h-3.5 text-[#D4A574]" />
                <span className="text-xs font-medium text-[#D4A574]">Personalised onboarding</span>
              </div>
              <OnboardingChat onComplete={handleChatComplete} />
            </motion.div>
          )}

          {/* CONFIRM */}
          {phase === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-white rounded-2xl border border-[#E8E4DF] px-5 py-5 mb-5 shadow-sm">
                <h2 className="font-bold text-[#1A1A1A] text-base mb-1">Here's what I learned about you</h2>
                <p className="text-xs text-[#8A8580] mb-4">Edit anything below, then I'll build your grid and add 5 personalised habits. ✨</p>

                {/* Read-only summary */}
                <div className="space-y-2 mb-4 pb-4 border-b border-[#F0EBE6]">
                  <Row label="Rhythm" value={RHYTHM_LABELS[extracted.rhythm_type] || extracted.rhythm_type || "—"} />
                  <Row label="Growth focus" value={GROWTH_LABELS[extracted.growth_focus] || extracted.growth_focus || "—"} />
                  <Row label="Sleep" value={`${toTimeStr(sleepH)} → wake ${toTimeStr(wakeH)}`} />
                  <Row label="Sleep goal" value={toTimeStr(goalH)} />
                  {unmovables.length > 0 && (
                    <Row label="Fixed blocks" value={unmovables.map((u) => `${u.label} ${u.start_hour}–${u.end_hour}h`).join(", ")} />
                  )}
                  {extracted.energy_pattern && <Row label="Most energized" value={extracted.energy_pattern} />}
                </div>

                {/* Editable: the deeper why */}
                <div className="space-y-4">
                  <Field label="Your goals (one per line)">
                    <textarea
                      value={draft.goals}
                      onChange={(e) => setDraft({ ...draft, goals: e.target.value })}
                      rows={3}
                      className="w-full rounded-xl border border-[#E8E4DF] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 resize-none"
                      placeholder="e.g. Read 20 min daily, sleep by 11pm"
                    />
                  </Field>
                  <Field label="What's blocked you before (one per line)">
                    <textarea
                      value={draft.challenges}
                      onChange={(e) => setDraft({ ...draft, challenges: e.target.value })}
                      rows={2}
                      className="w-full rounded-xl border border-[#E8E4DF] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 resize-none"
                      placeholder="e.g. Lose momentum after a few days"
                    />
                  </Field>
                  <Field label="Your deeper why">
                    <textarea
                      value={draft.motivation}
                      onChange={(e) => setDraft({ ...draft, motivation: e.target.value })}
                      rows={2}
                      className="w-full rounded-xl border border-[#E8E4DF] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 resize-none"
                      placeholder="Why this matters to you now"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Username">
                      <input
                        value={draft.username}
                        onChange={(e) => setDraft({ ...draft, username: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase().slice(0, 20) })}
                        placeholder="alex_builds"
                        className="w-full rounded-xl border border-[#E8E4DF] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10"
                      />
                    </Field>
                    <Field label="Partner name">
                      <input
                        value={draft.partner_name}
                        onChange={(e) => setDraft({ ...draft, partner_name: e.target.value.slice(0, 12) })}
                        placeholder="Alex"
                        className="w-full rounded-xl border border-[#E8E4DF] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setPhase("chat")}
                  className="flex-1 rounded-xl border-[#E8E4DF]"
                >
                  ← Back to chat
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={saving || !draft.username}
                  className="flex-1 bg-[#7C9A82] hover:bg-[#6B8A71] text-white rounded-xl"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Building...
                    </span>
                  ) : "✨ Build My Grid"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4 text-sm">
      <span className="text-[#8A8580] flex-shrink-0">{label}</span>
      <span className="text-[#1A1A1A] font-medium text-right">{value}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#8A8580] mb-1.5">{label}</label>
      {children}
    </div>
  );
}