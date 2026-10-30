import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAI } from "@/lib/plans";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { normalizeExtracted, isOnboardingComplete } from "@/components/onboarding/normalizeExtracted";

const MAX_WORDS = 1000;
const MAX_CHARS = 7000;

const SYSTEM = `You are the onboarding guide for SpareSquare, an AI growth partner app that finds hidden time in a person's day and helps them build habits that actually stick.

Have a warm, genuine, concise conversation to understand this person so you can personalize their experience and coach them well. You are NOT a form — you are a curious friend who happens to be setting them up for success.

Gather ALL of the following through natural conversation — one question at a time, but group related things naturally (e.g. ask the three sleep times together, ask commute with work hours):
1. Their daily rhythm + work/school hours (so we can map their "unmovable" — non-negotiable time blocks). Also whether they commute and roughly how long.
2. What they ALREADY do consistently — any routine, workout, reading, journaling, meal prep, anything that already sticks, with rough times if they mention them. Ask this as its own turn and make them feel good about it. It matters as much as their goals: we must never suggest back what they already do.
3. Their sleep: when they actually fall asleep, when they wake, and their ideal sleep time.
4. When they feel most energized and focused.
5. THE DEEPER WHY — this matters most, spend a turn or two here:
   - What they want to grow toward (fitness, business, inner peace, learning, creativity, relationships, financial freedom — can be several)
   - Specific, concrete goals they have
   - What has blocked or derailed them before — including anything they tried and dropped, and why it didn't last
   - Their deeper motivation — WHY this matters to them now
6. What they'd like to call their AI partner (suggest 2-3 if unsure).
7. A username (letters, numbers, underscores only) for leaderboards.

Rules:
- One question at a time. Aim for ~10-12 exchanges total. Warm, empathetic, never robotic or corporate.
- Ask tailored follow-ups based on their answers — dig into their why. If they say "I want to get fit," ask what that looks like and what's stopped them before.
- Briefly reflect what you heard before the next question, so they feel understood.
- Ask partner name + username together near the end.
- Never over-explain the app. Keep it about THEM.
- If they give short answers, that's fine — don't force depth, just move on.
- People can write a LOT at once. If they send a long answer or a full brain dump (up to ~1000 words), treat it as gold: mine every field you can from it — rhythm and hours, existing habits, sleep times, energy, growth focus, goals, challenges, motivation. Never ask again for anything they already told you.
- If one long answer already covers the essentials, do NOT keep interviewing them. Reflect back what you captured in a few short lines, then set complete=true — filling partner_name (pick something warm and short) and username (derive a short one from what they wrote) yourself if they didn't give them.
- Otherwise keep to one question at a time, and skip whatever their answer already covered.

Record captured fields in \`extracted\` as you go. Convert all times to 24-hour hour NUMBERS (0-23). Build \`unmovables\` as an array of {label, start_hour, end_hour, days} where days is lowercase day names (monday..sunday); use [] if it applies every day. growth_focus is EXACTLY one of: fitness, business, peace, learning, creativity, relationships. rhythm_type is EXACTLY one of: nine_to_five, student, night_shift, freelancer, parent, other. goals, challenges are arrays of short strings. motivation is one sentence.

Always include \`options\`: 2-4 short, clickable quick-replies the user can tap instead of typing, tailored to the current question so they feel like natural answers to what you just asked. Keep each one a few words. For open-ended "why" questions, offer evocative starting points rather than exhaustive choices.

Return ONLY this JSON object:
{
  "reply": "your message to the user — concise, markdown ok, max ~4 sentences",
  "options": ["short clickable reply", "another reply"],
  "extracted": {
    "rhythm_type": "nine_to_five|student|night_shift|freelancer|parent|other",
    "unmovables": [{"label":"Work","start_hour":9,"end_hour":17,"days":["monday","tuesday","wednesday","thursday","friday"]}],
    "existing_habits": ["Morning walk at 7am", "Gym 3x a week"],
    "sleep_hour": 23,
    "wake_hour": 7,
    "sleep_goal_hour": 22,
    "growth_focus": "fitness|business|peace|learning|creativity|relationships",
    "goals": ["..."],
    "challenges": ["..."],
    "motivation": "...",
    "energy_pattern": "...",
    "partner_name": "...",
    "username": "..."
  },
  "complete": false
}
Only include fields you have actually captured; keep previously captured fields stable. existing_habits is a list of short phrases for routines they already keep — leave it out entirely if they genuinely have none, never invent them. Set complete=true as soon as you know rhythm_type, sleep_hour, wake_hour, sleep_goal_hour, growth_focus, goals, and motivation — at that point suggest partner_name and username yourself if they haven't given them, and don't ask for anything else. If a single long answer gave you all of it, wrap up immediately instead of inventing more questions. On the completing turn your reply is a brief, warm wrap-up with no further questions, and options can be an empty array.`;

const OPENING = "Hey, I'm really glad you're here. 👋\n\nI'm going to ask a few quick questions to understand your life and what you're working toward — no forms, just a conversation. That way everything in SpareSquare gets tailored to *you*.\n\nLet's start easy: **what does a typical day look like?** Work, school, night shifts — tell me in your own words.\n\nAnd if you'd rather just write it *all* out in one go — your week, what you're working toward, what's gotten in the way — go for it. I'll pull out everything I need and skip the rest of the questions.";

// Deliberately loose: the model reports what it actually heard ("9am", "around
// midnight", "Mon-Fri") and normalizeExtracted turns it into the exact shapes the app
// needs. Strict enums and partial `required` lists make the AI provider reject the whole
// request, which killed a turn every time the model phrased something its own way.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    options: { type: "array", items: { type: "string" } },
    complete: { type: "boolean" },
    extracted: {
      type: "object",
      properties: {
        rhythm_type: { type: ["string", "null"] },
        unmovables: {
          type: ["array", "null"],
          items: {
            type: "object",
            properties: {
              label: { type: ["string", "null"] },
              start_hour: { type: ["number", "string", "null"] },
              end_hour: { type: ["number", "string", "null"] },
              days: { type: ["array", "null"], items: { type: "string" } },
            },
          },
        },
        existing_habits: { type: ["array", "null"], items: { type: "string" } },
        sleep_hour: { type: ["number", "string", "null"] },
        wake_hour: { type: ["number", "string", "null"] },
        sleep_goal_hour: { type: ["number", "string", "null"] },
        growth_focus: { type: ["string", "null"] },
        goals: { type: ["array", "null"], items: { type: "string" } },
        challenges: { type: ["array", "null"], items: { type: "string" } },
        motivation: { type: ["string", "null"] },
        energy_pattern: { type: ["string", "null"] },
        partner_name: { type: ["string", "null"] },
        username: { type: ["string", "null"] },
      },
      required: [
        "rhythm_type", "unmovables", "existing_habits", "sleep_hour", "wake_hour",
        "sleep_goal_hour", "growth_focus", "goals", "challenges", "motivation",
        "energy_pattern", "partner_name", "username",
      ],
      additionalProperties: false,
    },
  },
  required: ["reply", "options", "complete", "extracted"],
};

const OPENING_OPTIONS = ["9 to 5 job", "I'm a student", "Night shifts", "Freelance / flexible"];

export default function OnboardingChat({ onComplete }) {
  const [messages, setMessages] = useState([{ role: "assistant", content: OPENING }]);
  const [options, setOptions] = useState(OPENING_OPTIONS);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState({});
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, options]);

  // The box grows with what they write, so a long answer stays readable while typing.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [input]);

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setOptions([]);
    setLoading(true);
    try {
      const transcript = nextMessages
        .map((m) => `${m.role === "user" ? "User" : "Guide"}: ${m.content}`)
        .join("\n\n");
      const prompt = `${SYSTEM}\n\nConversation so far:\n${transcript}\n\nGuide: (respond with JSON only)`;
      const res = await invokeAI("onboarding_chat", {
        prompt,
        model: "gpt_5_mini",
        response_json_schema: RESPONSE_SCHEMA,
      });
      const reply = res?.reply || "Got it. Tell me a bit more?";
      // Cleaned into the exact shapes the app expects; nothing already captured is lost.
      const merged = { ...extracted, ...normalizeExtracted(res?.extracted) };
      setExtracted(merged);
      const nextOptions = Array.isArray(res?.options) ? res.options.slice(0, 4) : [];
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setOptions(nextOptions);
      // A long, complete answer can cover everything at once — no need to finish the questions.
      if (res?.complete || isOnboardingComplete(merged)) {
        setTimeout(() => onComplete(merged), 700);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Hmm, I didn't quite catch that — mind saying that again?" },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const userTurns = messages.filter((m) => m.role === "user").length;
  const canWrap = userTurns >= 1 && !loading;
  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex-1 space-y-3 overflow-y-auto min-h-0 pb-4">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                  ${m.role === "user"
                    ? "bg-[#1A1A1A] text-white rounded-br-md"
                    : "bg-white border border-[#E8E4DF] text-[#1A1A1A] rounded-bl-md shadow-sm"}`}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#E8E4DF] px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-[#8A8580] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-[#8A8580] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-[#8A8580] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {canWrap && (
        <button
          onClick={() => onComplete(extracted)}
          className="self-center text-xs text-[#8A8580] hover:text-[#1A1A1A] mb-2 underline underline-offset-2"
        >
          I've said enough — wrap up
        </button>
      )}

      {/* Suggested quick-replies — tap to send instead of typing */}
      <AnimatePresence>
        {options.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
          >
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => send(opt)}
                className="flex-shrink-0 px-3.5 py-2 rounded-full bg-white border border-[#E8E4DF] text-sm text-[#1A1A1A] hover:border-[#1A1A1A] hover:bg-[#F5F0EB] transition-colors"
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {wordCount > 12 && (
        <div className="text-[11px] text-[#B0AAA4] text-right pr-1 pb-1">
          {wordCount} / {MAX_WORDS} words · no rush, say it all
        </div>
      )}

      <div className="flex gap-2 items-end bg-[#FAF8F5] pt-1 pb-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={MAX_CHARS}
          placeholder="Type your answer — or write everything about yourself at once"
          disabled={loading}
          className="flex-1 resize-none rounded-xl border border-[#E8E4DF] bg-white px-4 py-3 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 placeholder:text-[#B0AAA4] disabled:opacity-50"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="w-11 h-11 flex-shrink-0 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center disabled:opacity-30 hover:bg-[#333] transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}