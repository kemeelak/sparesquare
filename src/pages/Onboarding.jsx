import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAI } from "@/lib/plans";
import { createPageUrl } from "../utils";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import OnboardingChat from "@/components/onboarding/OnboardingChat";
import WelcomeIntro from "@/components/onboarding/WelcomeIntro";
import CommuteSetup from "@/components/commute/CommuteSetup";
import UnmovableEditor from "@/components/onboarding/UnmovableEditor";
import { partitionNewHabits } from "@/lib/habitDedupe";
import { cleanText, cleanList } from "@/lib/cleanText";

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

// Someone can be growing in several directions at once — show every one they named.
function growthLabelList(extracted) {
  const list = extracted.growth_focuses?.length ? extracted.growth_focuses : [extracted.growth_focus];
  return list.filter(Boolean).map((g) => GROWTH_LABELS[g] || g);
}

function toTimeStr(h) {
  const hr = ((h % 24) + 24) % 24;
  if (hr === 0) return "12:00 AM";
  if (hr === 12) return "12:00 PM";
  return hr < 12 ? `${hr}:00 AM` : `${hr - 12}:00 PM`;
}

export default function Onboarding() {
  // intro = the quick "here's what this does" before the first question
  const [phase, setPhase] = useState("intro"); // intro | chat | confirm | commute
  const [extracted, setExtracted] = useState({});
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [createdProfile, setCreatedProfile] = useState(null);
  const [commuteSaving, setCommuteSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
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
    setSaveError(null);
    try {
      await saveProfile();
    } catch (e) {
      console.error("onboarding: save failed", e);
      setSaveError("That didn't save. Give it another go.");
    } finally {
      setSaving(false);
    }
  };

  // Their profile is the only thing that has to land. Everything after it — the public
  // profile, the habit suggestions — is a bonus and must never block them getting in.
  const saveProfile = async () => {
    const me = await base44.auth.me();
    // Nothing here is mandatory — someone who already told us everything shouldn't have to
    // fill in the rest, so a username falls back to their email handle.
    const username = (
      draft.username ||
      me?.email?.split("@")[0] ||
      me?.full_name ||
      "you"
    ).replace(/[^a-z0-9_]/gi, "").toLowerCase() || "you";

    const growthLabels = growthLabelList(extracted);
    const existingHabits = cleanList(extracted.existing_habits || []);

    const sleepH = extracted.sleep_hour ?? 23;
    const wakeH = extracted.wake_hour ?? 7;
    const goalH = extracted.sleep_goal_hour ?? sleepH;

    const created = await base44.entities.UserProfile.create({
      rhythm_type: extracted.rhythm_type || "other",
      unmovables: extracted.unmovables || [],
      sleep_actual: toTimeStr(sleepH),
      sleep_goal: toTimeStr(goalH),
      wake_time: toTimeStr(wakeH),
      growth_focus: extracted.growth_focus || growthLabels[0] || "learning",
      growth_focuses: extracted.growth_focuses || (extracted.growth_focus ? [extracted.growth_focus] : []),
      energy_pattern: extracted.energy_pattern || "",
      extra_notes: cleanList(extracted.extra_notes || []),
      onboarding_complete: true,
      timezone_offset: new Date().getTimezoneOffset() / -60,
      partner_name: draft.partner_name || "Partner",
      goals: cleanList(draft.goals),
      challenges: cleanList(draft.challenges),
      motivation: cleanText(draft.motivation),
      existing_habits: existingHabits,
    });

    setCreatedProfile(created);

    try {
      await savePublicProfile(me, username);
    } catch (e) {
      console.error("onboarding: public profile failed", e);
    }

    try {
      await suggestBacklog(
        {
          rhythm: RHYTHM_LABELS[extracted.rhythm_type] || "other",
          growth: growthLabels.join(", ") || "learning",
          sleep: `${toTimeStr(sleepH)} → wake ${toTimeStr(wakeH)}`,
          energy: extracted.energy_pattern,
          goals: draft.goals,
          challenges: draft.challenges,
          motivation: draft.motivation,
          notes: (extracted.extra_notes || []).join("; "),
        },
        existingHabits
      );
    } catch (e) {
      console.error("onboarding: habit suggestions failed", e);
    }

    // Commute is the last onboarding step — it can be skipped with the X
    setPhase("commute");
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
          {/* INTRO — three quick beats so nobody starts the chat blind */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <WelcomeIntro onDone={startChat} />
              <p className="text-xs text-[#B0AAA4] text-center mt-3">
                Then 2-3 minutes of questions, no forms
              </p>
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
                <p className="text-xs text-[#8A8580] mb-4">Edit anything below, then I'll build your grid — and only suggest habits that are genuinely missing. ✨</p>

                {/* Read-only summary */}
                <div className="space-y-2 mb-4 pb-4 border-b border-[#F0EBE6]">
                  <Row label="Rhythm" value={RHYTHM_LABELS[extracted.rhythm_type] || extracted.rhythm_type || "—"} />
                  <Row label="Working on" value={growthLabelList(extracted).join(" · ") || "—"} />
                  <Row label="Sleep" value={`${toTimeStr(sleepH)} → wake ${toTimeStr(wakeH)}`} />
                  <Row label="Sleep goal" value={toTimeStr(goalH)} />
                  {extracted.energy_pattern && <Row label="Most energized" value={extracted.energy_pattern} />}
                </div>

                {/* Everything they said, as we heard it — fix anything misheard before it sticks */}
                <div className="space-y-4">
                  <Field label="Fixed blocks — check the times">
                    <UnmovableEditor
                      blocks={unmovables}
                      onChange={(blocks) => setExtracted((prev) => ({ ...prev, unmovables: blocks }))}
                    />
                  </Field>
                  <Field label="Already consistent (one per line)">
                    <textarea
                      value={(extracted.existing_habits || []).join("\n")}
                      onChange={(e) =>
                        setExtracted((prev) => ({
                          ...prev,
                          existing_habits: e.target.value.split("\n").map((v) => v.trim()).filter(Boolean),
                        }))
                      }
                      rows={2}
                      className="w-full rounded-xl border border-[#E8E4DF] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 resize-none"
                      placeholder="e.g. Walk the dog every morning"
                    />
                  </Field>
                  <Field label="Also noted (one per line)">
                    <textarea
                      value={(extracted.extra_notes || []).join("\n")}
                      onChange={(e) =>
                        setExtracted((prev) => ({
                          ...prev,
                          extra_notes: e.target.value.split("\n").map((v) => v.trim()).filter(Boolean),
                        }))
                      }
                      rows={2}
                      className="w-full rounded-xl border border-[#E8E4DF] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 resize-none"
                      placeholder="Anything else you told me"
                    />
                  </Field>
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
                    <Field label="Username (optional)">
                      <input
                        value={draft.username}
                        onChange={(e) => setDraft({ ...draft, username: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase().slice(0, 20) })}
                        placeholder="picked for you"
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

              {saveError && (
                <p className="text-sm text-red-600 text-center mb-3">{saveError}</p>
              )}

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
                  disabled={saving}
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

        {phase === "commute" && createdProfile && (
          <CommuteSetup
            profile={createdProfile}
            isSaving={commuteSaving}
            onClose={() => (window.location.href = createPageUrl("Home"))}
            onSave={async (commuteData) => {
              setCommuteSaving(true);
              await base44.entities.UserProfile.update(createdProfile.id, { commute: commuteData });
              window.location.href = createPageUrl("Home");
            }}
          />
        )}
      </div>
    </div>
  );
}

// Their handle so friends can find them — optional, so a failure here is logged, not fatal.
async function savePublicProfile(me, username) {
  if (!me || !username) return;
  const existing = await base44.entities.UserPublicProfile.filter({ created_by_id: me.id });
  if (existing.length > 0) {
    await base44.entities.UserPublicProfile.update(existing[0].id, {
      username,
      display_name: me.full_name || username,
      user_id: me.id,
    });
    return;
  }
  await base44.entities.UserPublicProfile.create({
    user_id: me.id,
    username,
    display_name: me.full_name || username,
    current_streak: 0,
    total_completed: 0,
  });
}

// A few things genuinely missing from their life, ready to schedule later.
async function suggestBacklog(profileSummary, existingHabits) {
  const suggestions = await invokeAI("onboarding_plan", {
    prompt: `Suggest habits for this person's backlog — only ones genuinely missing from their life.

Be ruthless about relevance:
- Never suggest anything they already do consistently.
- Never suggest something they said they tried before and dropped for a real reason.
- Only what their stated goals actually require, and their real schedule can hold.
- Fewer is better. Give 4 at most, and return an EMPTY array rather than filler.

User profile:
${Object.entries(profileSummary).map(([k, v]) => `${k}: ${v}`).join("\n")}
${existingHabits.length ? `\nAlready does consistently — do NOT suggest these or near-copies of them:\n${existingHabits.map((h) => `- ${h}`).join("\n")}` : ""}

Return JSON with a habits array (0-4 items), each with: title, description, duration_minutes (15-60), energy_level (low/medium/high), category (fitness/mindfulness/learning/nutrition/sleep/productivity/social/creative).`,
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

  const { fresh } = partitionNewHabits(suggestions?.habits || [], existingHabits);
  if (fresh.length === 0) return;

  await base44.entities.HabitBlock.bulkCreate(
    fresh.map((h) => ({
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