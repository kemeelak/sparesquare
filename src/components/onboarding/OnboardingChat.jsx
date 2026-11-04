import React, { useState, useRef, useEffect } from "react";
import { invokeAI } from "@/lib/plans";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { normalizeExtracted, isOnboardingComplete } from "@/components/onboarding/normalizeExtracted";

const MAX_WORDS = 1000;
const MAX_CHARS = 7000;
const SOFT_TURNS = 6;

const SYSTEM = `You are the person setting SpareSquare up for a new member. You are a warm, normal human — not an AI assistant, not a form, not a coach giving a speech.

Your only job: learn enough about their real week to personalise their grid, then get out of the way. The whole thing should take five to seven exchanges.

How you talk:
- Short, plain, everyday language. One or two sentences, plus the question.
- No "as an AI", no "I'd be happy to help", no corporate warmth, no motivational filler, no emoji spam (one at most).
- React to what they said in a few words before asking the next thing, so they feel heard.
- Ask ONE thing at a time and make it easy to answer with a word or a tap.
- Always offer 2-4 clickable answers. When more than one could genuinely be true for them, say so briefly ("all that apply") — they can tap several. Do not offer clickable answers for a real "why" question; give two or three evocative starting points instead.
- If they answer in two words, take it and move on. Never dig for depth they didn't offer.
- If they dump everything at once, that's ideal: take all of it, skip everything already answered, and wrap up on that same turn.
- If they say "not sure", "skip", or clearly don't want to answer, accept it, leave that field out, and move on. Nothing here is mandatory.
- Never repeat a question they already answered, and never ask for what their schedule already implies.
- If they mention something you don't strictly need — a kid, an injury, a side project, a hobby, a bad week, a time of day they can't use — keep it in notes as a short fact. Do not ask about it.

What you actually need before wrapping up:
1. The shape of their day: work, school, shifts, caregiving, and roughly when. Anything recurring they can't move.
2. Sleep: when they actually go to bed, when they get up, and when they'd like to.
3. What they're working on — one OR SEVERAL areas — and why it matters now.
4. What has stopped them before.

Partner name and username are nice-to-have only: suggest both yourself at the end if they never mentioned them. Never spend a turn on them.

Record what you learn in extracted. Times become 24-hour hour NUMBERS (0-23). unmovables is [{label, start_hour, end_hour, days}] for time they genuinely can't move (work, class, commute, caregiving), with lowercase day names and [] meaning every day — a routine they already keep (dog walk, gym, journaling) belongs in existing_habits instead. growth_focus is comma-separated when there's more than one (e.g. "fitness, peace"). rhythm_type is exactly one of nine_to_five, student, night_shift, freelancer, parent, other. goals and challenges are short strings. motivation is one sentence in their words. notes is any other fact worth remembering about them — never repeat something already sitting in another field.

Return ONLY this JSON object:
{
  "reply": "your message — 1-2 sentences plus the question, markdown ok",
  "options": ["short clickable answer", "another"],
  "extracted": {
    "rhythm_type": "nine_to_five|student|night_shift|freelancer|parent|other",
    "unmovables": [{"label":"Work","start_hour":9,"end_hour":17,"days":["monday"]}],
    "existing_habits": ["Morning walk at 7am"],
    "sleep_hour": 23,
    "wake_hour": 7,
    "sleep_goal_hour": 22,
    "growth_focus": "fitness, peace",
    "energy_pattern": "sharpest before 10am",
    "goals": ["..."],
    "challenges": ["..."],
    "motivation": "...",
    "notes": ["has a 4-year-old", "left knee injury"],
    "partner_name": "...",
    "username": "..."
  },
  "complete": false
}
Only include fields you actually captured, and keep previously captured fields stable. existing_habits is short phrases for routines they already keep — leave it out entirely if they have none, never invent them. notes is anything else you learned about them, never invented.

Set complete=true once you know the shape of their day, their sleep times, what they're working on and their why — filling in partner_name and username yourself if they never gave them. On that turn, reply is a one-line warm wrap-up with no new question, and options can be empty.`;

const OPENING = "Hey — glad you're here. I'll ask a handful of quick things so SpareSquare fits your actual life, then get out of your way.\n\nTo start: **what does a typical weekday look like for you?** Work, school, shifts, kids — whatever takes the time.\n\nAnswer however you like. A few words is fine, or dump the whole thing at once — your week, what you're working on, what's gotten in the way — and I'll pull out what I need.";

// Deliberately loose: the model reports what it actually heard ("9am", "around
// midnight", "Mon-Fri", "fitness and peace") and normalizeExtracted turns it into the
// exact shapes the app needs. Strict enums and partial `required` lists make the AI
// provider reject the whole request, which killed a turn every time the model phrased
// something its own way.
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
        notes: { type: ["array", "null"], items: { type: "string" } },
        partner_name: { type: ["string", "null"] },
        username: { type: ["string", "null"] },
      },
      required: ["rhythm_type"],
    },
  },
  required: ["reply", "options", "complete", "extracted"],
};

const OPENING_OPTIONS = ["9 to 5 office job", "I'm a student", "Night shifts", "Freelance / flexible"];

// Anything they mention twice keeps both facts, and nothing already learned is lost
// when a later answer only covers part of a list.
function mergeList(before, after) {
  const out = [...(before || [])];
  (after || []).forEach((item) => {
    if (!out.includes(item)) out.push(item);
  });
  return out;
}

export default function OnboardingChat({ onComplete }) {
  const [messages, setMessages] = useState([{ role: "assistant", content: OPENING }]);
  const [options, setOptions] = useState(OPENING_OPTIONS);
  const [picked, setPicked] = useState([]);
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

  const togglePick = (option) => {
    setPicked((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
    );
  };

  // One AI turn. A dropped call gets one silent retry before we tell them anything went
  // wrong, and a model that answers with JSON as text is parsed rather than discarded.
  const askGuide = async (prompt) => {
    const call = async () => {
      const res = await invokeAI("onboarding_chat", {
        prompt,
        model: "gpt_5_mini",
        response_json_schema: RESPONSE_SCHEMA,
      });
      if (typeof res === "string") {
        try { return JSON.parse(res); } catch { return null; }
      }
      return res;
    };
    try {
      return await call();
    } catch (e) {
      return await call();
    }
  };

  const send = async () => {
    // Tapped answers and typed detail can be sent together — whatever they gave us counts.
    const text = [input.trim(), ...picked].filter(Boolean).join(", ");
    if (!text || loading) return;
    const nextMessages = [...messages, { role: "user", content: text }];
    const turnCount = nextMessages.filter((m) => m.role === "user").length;
    setMessages(nextMessages);
    setInput("");
    setPicked([]);
    setOptions([]);
    setLoading(true);
    try {
      const transcript = nextMessages
        .map((m) => `${m.role === "user" ? "User" : "Guide"}: ${m.content}`)
        .join("\n\n");
      const nudge = turnCount >= SOFT_TURNS
        ? " This is already a long conversation — wrap up on this turn unless something essential is still missing."
        : "";
      const prompt = `${SYSTEM}\n\nExchanges so far: ${turnCount}.${nudge}\n\nConversation so far:\n${transcript}\n\nGuide: (respond with JSON only)`;
      const res = await askGuide(prompt);
      // Nothing came back: out of credits (the upgrade prompt is already up). Let them
      // carry on with what we've got instead of stranding them in the chat.
      if (!res) {
        setOptions([]);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I can't reply again on this plan. Tap \"That's enough — take me in\" and I'll build your grid from what you've told me.",
          },
        ]);
        return;
      }
      const reply = res.reply || "Say a bit more?";
      // Cleaned into the exact shapes the app expects; nothing already captured is lost.
      const clean = normalizeExtracted(res?.extracted);
      const merged = {
        ...extracted,
        ...clean,
        existing_habits: mergeList(extracted.existing_habits, clean.existing_habits),
        goals: mergeList(extracted.goals, clean.goals),
        challenges: mergeList(extracted.challenges, clean.challenges),
        extra_notes: mergeList(extracted.extra_notes, clean.extra_notes),
        unmovables: clean.unmovables?.length ? clean.unmovables : extracted.unmovables,
      };
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
        { role: "assistant", content: "That didn't go through on my end. Send it once more?" },
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
          That's enough — take me in
        </button>
      )}

      {/* Suggested answers — tap one, or as many as fit, then send */}
      <AnimatePresence>
        {options.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex flex-wrap gap-2 pb-2"
          >
            {options.map((opt, i) => {
              const active = picked.includes(opt);
              return (
                <button
                  key={i}
                  onClick={() => togglePick(opt)}
                  aria-pressed={active}
                  className={`px-3.5 py-2 rounded-full border text-sm transition-colors
                    ${active
                      ? "bg-[#1A1A1A] border-[#1A1A1A] text-white"
                      : "bg-white border-[#E8E4DF] text-[#1A1A1A] hover:border-[#1A1A1A] hover:bg-[#F5F0EB]"}`}
                >
                  {opt}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {(wordCount > 12 || picked.length > 0) && (
        <div className="text-[11px] text-[#B0AAA4] text-right pr-1 pb-1">
          {picked.length > 0 && `${picked.length} picked · tap more or send`}
          {picked.length > 0 && wordCount > 12 && " · "}
          {wordCount > 12 && `${wordCount} / ${MAX_WORDS} words · no rush, say it all`}
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
          placeholder="Type anything — a word, or everything at once"
          disabled={loading}
          className="flex-1 resize-none rounded-xl border border-[#E8E4DF] bg-white px-4 py-3 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 placeholder:text-[#B0AAA4] disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={loading || (!input.trim() && picked.length === 0)}
          className="w-11 h-11 flex-shrink-0 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center disabled:opacity-30 hover:bg-[#333] transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}