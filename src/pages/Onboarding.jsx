import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "../utils";
import ChatBubble from "../components/chat/ChatBubble";
import ChatInput from "../components/chat/ChatInput";
import LoadingDots from "../components/shared/LoadingDots";
import { motion, AnimatePresence } from "framer-motion";

// Each step has a fixed question + quick-reply chips
const STEPS = [
  {
    field: "rhythm_type",
    question: "Welcome to SpareSquare! 👋 I'm here to help you find hidden growth windows in your day.\n\nFirst up — what best describes your daily rhythm?",
    chips: ["9-to-5 Worker", "Student", "Night Shift", "Freelancer / Entrepreneur", "Stay-at-home Parent"],
  },
  {
    field: "unmovables",
    question: "Got it! Now tell me about your **Unmovables** — the blocks that are non-negotiable (work hours, school, childcare, gym class, etc.).\n\nWhat time do they usually run? e.g. *Work: 9am–5pm, Mon–Fri*",
    chips: ["9am–5pm weekdays", "8am–3pm weekdays", "Varies / tell me more"],
  },
  {
    field: "sleep",
    question: "Perfect. Now your sleep window — when do you *actually* fall asleep and when do you wake up? And what's your *goal* sleep time?",
    chips: ["Sleep 11pm, wake 7am", "Sleep 12am, wake 6am", "Sleep 10pm, wake 5am"],
  },
  {
    field: "growth_focus",
    question: "Last one! What is the **best version of you** working on right now?",
    chips: ["Fitness & Health", "Building a Business", "Inner Peace / Mindfulness", "Learning & Skills", "Creativity", "Relationships"],
  },
];

const GROWTH_MAP = {
  "Fitness & Health": "fitness",
  "Building a Business": "business",
  "Inner Peace / Mindfulness": "peace",
  "Learning & Skills": "learning",
  "Creativity": "creativity",
  "Relationships": "relationships",
};

const RHYTHM_MAP = {
  "9-to-5 Worker": "nine_to_five",
  "Student": "student",
  "Night Shift": "night_shift",
  "Freelancer / Entrepreneur": "freelancer",
  "Stay-at-home Parent": "parent",
};

function parseProfileFromAnswers(answers) {
  // rhythm
  const rhythm = RHYTHM_MAP[answers[0]] || "other";

  // unmovables — use LLM-parsed or simple heuristic
  const unmovables = [];
  const unmovableText = answers[1] || "";
  const timeMatch = unmovableText.match(/(\d+)\s*[:\-]?\s*(am|pm)?\s*[–\-to]+\s*(\d+)\s*(am|pm)?/i);
  if (timeMatch) {
    let start = parseInt(timeMatch[1]);
    let end = parseInt(timeMatch[3]);
    if (timeMatch[2]?.toLowerCase() === "pm" && start !== 12) start += 12;
    if (timeMatch[4]?.toLowerCase() === "pm" && end !== 12) end += 12;
    unmovables.push({ label: "Work / Commitments", start_hour: start, end_hour: end, days: ["monday","tuesday","wednesday","thursday","friday"] });
  }

  // sleep
  const sleepText = answers[2] || "";
  const sleepMatch = sleepText.match(/sleep\s+(\d+)(am|pm)?/i);
  const wakeMatch = sleepText.match(/wake\s+(\d+)(am|pm)?/i);
  let sleepActual = "11:00 PM", wakeTime = "7:00 AM";
  if (sleepMatch) {
    let h = parseInt(sleepMatch[1]);
    const ampm = sleepMatch[2]?.toLowerCase();
    if (ampm === "pm" && h !== 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    sleepActual = h >= 12 ? `${h === 12 ? 12 : h - 12}:00 PM` : `${h}:00 AM`;
  }
  if (wakeMatch) {
    let h = parseInt(wakeMatch[1]);
    const ampm = wakeMatch[2]?.toLowerCase();
    if (ampm === "pm" && h !== 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    wakeTime = h >= 12 ? `${h === 12 ? 12 : h - 12}:00 PM` : `${h}:00 AM`;
  }

  // growth
  const growth = GROWTH_MAP[answers[3]] || answers[3]?.toLowerCase() || "learning";

  return { rhythm, unmovables, sleepActual, wakeTime, growth };
}

export default function Onboarding() {
  const [messages, setMessages] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [done, setDone] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Kick off with step 0 question
    const firstMsg = { role: "assistant", content: STEPS[0].question };
    setMessages([firstMsg]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const advance = async (text) => {
    const userMsg = { role: "assistant", content: text }; // placeholder, shown as user
    const newAnswers = [...answers, text];
    setAnswers(newAnswers);

    const nextStep = currentStep + 1;

    if (nextStep < STEPS.length) {
      setCurrentStep(nextStep);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: STEPS[nextStep].question },
      ]);
    } else {
      // All steps done
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: "✨ Perfect! I'm setting up your personal grid now..." },
      ]);
      setDone(true);

      const parsed = parseProfileFromAnswers(newAnswers);
      await base44.entities.UserProfile.create({
        rhythm_type: parsed.rhythm,
        unmovables: parsed.unmovables,
        sleep_actual: parsed.sleepActual,
        sleep_goal: parsed.sleepActual,
        wake_time: parsed.wakeTime,
        growth_focus: parsed.growth,
        onboarding_complete: true,
        timezone_offset: new Date().getTimezoneOffset() / -60,
      });

      setTimeout(() => {
        window.location.href = createPageUrl("Home");
      }, 1500);
    }
  };

  const chips = !done && currentStep < STEPS.length ? STEPS[currentStep].chips : [];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">S²</span>
          </div>
          <h1 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Welcome to SpareSquare</h1>
          <p className="text-sm text-[#8A8580] mt-0.5">Let's map your day and find your growth windows</p>
        </motion.div>

        {/* Progress */}
        <div className="flex gap-2 mb-4 justify-center">
          {STEPS.map((_, s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                s < currentStep ? "w-8 bg-[#7C9A82]" : s === currentStep ? "w-8 bg-[#1A1A1A]" : "w-4 bg-[#E8E4DF]"
              }`}
            />
          ))}
        </div>

        {/* Chat Area */}
        <div className="bg-[#F5F0EB] rounded-2xl p-4 mb-3 min-h-[200px] max-h-[45vh] overflow-y-auto">
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick-reply chips */}
        <AnimatePresence>
          {chips.length > 0 && !done && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap gap-2 mb-3"
            >
              {chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => advance(chip)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#E8E4DF] text-sm text-[#4A5568]
                    hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-all duration-150 font-medium"
                >
                  {chip}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Free-text input */}
        {!done && (
          <ChatInput
            onSend={advance}
            disabled={done}
            placeholder="Or type your own answer..."
          />
        )}
      </div>
    </div>
  );
}