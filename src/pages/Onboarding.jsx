import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "../utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

// Steps with multi-select support
const STEPS = [
  {
    field: "rhythm_type",
    question: "Welcome to SpareSquare! 👋\n\nI'm your AI growth partner. I'll find hidden time in your day and help you build habits that actually stick.\n\nFirst — what best describes your daily rhythm?",
    chips: ["9-to-5 Worker", "Student", "Night Shift", "Freelancer / Entrepreneur", "Stay-at-home Parent", "Retired", "Other"],
    multi: false,
  },
  {
    field: "unmovables_work",
    question: "Got it. Now let's map your **Unmovables** — the blocks that are completely non-negotiable.\n\n**Work / School hours?**",
    chips: ["9am–5pm Mon–Fri", "8am–4pm Mon–Fri", "8am–3pm Mon–Fri", "10am–6pm Mon–Fri", "Shift work / irregular", "I work from home / flexible", "None"],
    multi: false,
  },
  {
    field: "unmovables_other",
    question: "Any other regular commitments? (Select all that apply)",
    chips: ["School run / childcare", "Gym class / PT session", "Commute (30+ min each way)", "Medical appointments", "Religious practice", "Evening class", "None of the above"],
    multi: true,
  },
  {
    field: "sleep_actual",
    question: "Now your **sleep window** — when do you *actually* tend to fall asleep?",
    chips: ["Before 10pm", "Around 10–10:30pm", "Around 11pm", "Around midnight", "After midnight", "It varies a lot"],
    multi: false,
  },
  {
    field: "wake_time",
    question: "And when do you usually wake up?",
    chips: ["Before 5am", "5–6am", "6–7am", "7–8am", "After 8am", "It varies"],
    multi: false,
  },
  {
    field: "sleep_goal",
    question: "What's your **ideal** sleep time — when would you *love* to be asleep by?",
    chips: ["9–10pm", "10–10:30pm", "10:30–11pm", "11pm–midnight", "Same as now"],
    multi: false,
  },
  {
    field: "growth_focus",
    question: "Almost done! What is the **best version of you** working on? (Pick all that resonate)",
    chips: ["💪 Fitness & Health", "💼 Building a Business", "🧘 Inner Peace / Mindfulness", "📚 Learning & Skills", "🎨 Creativity", "❤️ Relationships", "💰 Financial Freedom"],
    multi: true,
  },
  {
    field: "energy_pattern",
    question: "Last one! When do you feel **most energised and focused** during the day?",
    chips: ["Early morning (5–9am)", "Mid-morning (9am–12pm)", "Afternoon (12–5pm)", "Evening (5–9pm)", "Late night (9pm+)", "I'm consistent throughout"],
    multi: false,
  },
];

const GROWTH_MAP = {
  "💪 Fitness & Health": "fitness",
  "💼 Building a Business": "business",
  "🧘 Inner Peace / Mindfulness": "peace",
  "📚 Learning & Skills": "learning",
  "🎨 Creativity": "creativity",
  "❤️ Relationships": "relationships",
  "💰 Financial Freedom": "business",
};

const RHYTHM_MAP = {
  "9-to-5 Worker": "nine_to_five",
  "Student": "student",
  "Night Shift": "night_shift",
  "Freelancer / Entrepreneur": "freelancer",
  "Stay-at-home Parent": "parent",
  "Retired": "other",
  "Other": "other",
};

function buildSummary(answers) {
  return `Here's your profile — confirm or edit below:\n\n` +
    `**Rhythm:** ${answers.rhythm_type || "—"}\n` +
    `**Work hours:** ${answers.unmovables_work || "—"}\n` +
    `**Other commitments:** ${answers.unmovables_other?.join(", ") || "None"}\n` +
    `**Current sleep time:** ${answers.sleep_actual || "—"}\n` +
    `**Wake time:** ${answers.wake_time || "—"}\n` +
    `**Goal sleep time:** ${answers.sleep_goal || "—"}\n` +
    `**Growth focus:** ${answers.growth_focus?.join(", ") || "—"}\n` +
    `**Peak energy:** ${answers.energy_pattern || "—"}`;
}

function parseSleepHour(label) {
  const map = {
    "Before 10pm": 21, "Around 10–10:30pm": 22, "Around 11pm": 23,
    "Around midnight": 0, "After midnight": 1, "It varies a lot": 23,
    "9–10pm": 21, "10–10:30pm": 22, "10:30–11pm": 23,
    "11pm–midnight": 23, "Same as now": 23,
  };
  return map[label] ?? 23;
}

function parseWakeHour(label) {
  const map = {
    "Before 5am": 4, "5–6am": 5, "6–7am": 6, "7–8am": 7,
    "After 8am": 8, "It varies": 7,
  };
  return map[label] ?? 7;
}

function buildUnmovables(workAnswer, otherAnswers) {
  const blocks = [];
  const workMap = {
    "9am–5pm Mon–Fri": { start: 9, end: 17, days: ["monday","tuesday","wednesday","thursday","friday"], label: "Work" },
    "8am–4pm Mon–Fri": { start: 8, end: 16, days: ["monday","tuesday","wednesday","thursday","friday"], label: "Work" },
    "8am–3pm Mon–Fri": { start: 8, end: 15, days: ["monday","tuesday","wednesday","thursday","friday"], label: "School" },
    "10am–6pm Mon–Fri": { start: 10, end: 18, days: ["monday","tuesday","wednesday","thursday","friday"], label: "Work" },
  };
  if (workMap[workAnswer]) {
    const w = workMap[workAnswer];
    blocks.push({ label: w.label, start_hour: w.start, end_hour: w.end, days: w.days });
  }
  if (otherAnswers?.includes("School run / childcare")) {
    blocks.push({ label: "School run", start_hour: 7, end_hour: 9, days: ["monday","tuesday","wednesday","thursday","friday"] });
  }
  if (otherAnswers?.includes("Commute (30+ min each way)")) {
    blocks.push({ label: "Commute", start_hour: 8, end_hour: 9, days: ["monday","tuesday","wednesday","thursday","friday"] });
  }
  return blocks;
}

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState([]); // current step selections
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentStep, showConfirm]);

  const step = STEPS[currentStep];

  const toggleChip = (chip) => {
    if (!step.multi) {
      setSelected([chip]);
    } else {
      setSelected((prev) =>
        prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
      );
    }
  };

  const handleNext = () => {
    const value = selected.length > 0 ? (step.multi ? selected : selected[0]) : customInput || null;
    if (!value && !customInput) return;
    const finalValue = selected.length > 0 ? (step.multi ? selected : selected[0]) : customInput;
    const newAnswers = { ...answers, [step.field]: finalValue };
    setAnswers(newAnswers);
    setSelected([]);
    setCustomInput("");

    if (currentStep + 1 >= STEPS.length) {
      setShowConfirm(true);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    const sleepH = parseSleepHour(answers.sleep_actual);
    const wakeH = parseWakeHour(answers.wake_time);
    const goalH = parseSleepHour(answers.sleep_goal || answers.sleep_actual);

    const toTimeStr = (h) => {
      if (h === 0) return "12:00 AM";
      if (h === 12) return "12:00 PM";
      return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
    };

    const growthFocuses = Array.isArray(answers.growth_focus) ? answers.growth_focus : [answers.growth_focus];
    const primaryGrowth = GROWTH_MAP[growthFocuses[0]] || "learning";
    const unmovables = buildUnmovables(answers.unmovables_work, answers.unmovables_other);

    await base44.entities.UserProfile.create({
      rhythm_type: RHYTHM_MAP[answers.rhythm_type] || "other",
      unmovables,
      sleep_actual: toTimeStr(sleepH),
      sleep_goal: toTimeStr(goalH),
      wake_time: toTimeStr(wakeH),
      growth_focus: primaryGrowth,
      onboarding_complete: true,
      timezone_offset: new Date().getTimezoneOffset() / -60,
    });

    window.location.href = createPageUrl("Home");
  };

  const canProceed = selected.length > 0 || customInput.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 pt-10" ref={containerRef}>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">S²</span>
          </div>
          <h1 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Welcome to SpareSquare</h1>
          <p className="text-sm text-[#8A8580] mt-0.5">Let's map your day and find your growth windows</p>
        </motion.div>

        {/* Progress bar */}
        {!showConfirm && (
          <div className="flex gap-1.5 mb-6 justify-center">
            {STEPS.map((_, s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  s < currentStep ? "w-6 bg-[#7C9A82]" : s === currentStep ? "w-8 bg-[#1A1A1A]" : "w-3 bg-[#E8E4DF]"
                }`}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {!showConfirm ? (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              {/* Question bubble */}
              <div className="bg-white rounded-2xl border border-[#E8E4DF] px-5 py-4 mb-4 shadow-sm">
                <div className="text-sm leading-relaxed text-[#1A1A1A] prose prose-sm max-w-none prose-p:my-1">
                  <ReactMarkdown>{step.question}</ReactMarkdown>
                </div>
                {step.multi && (
                  <p className="text-xs text-[#B0AAA4] mt-2">Select all that apply</p>
                )}
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {step.chips.map((chip) => {
                  const isSelected = selected.includes(chip);
                  return (
                    <button
                      key={chip}
                      onClick={() => toggleChip(chip)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-150
                        ${isSelected
                          ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                          : "bg-white text-[#4A5568] border-[#E8E4DF] hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
                        }`}
                    >
                      {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                      {chip}
                    </button>
                  );
                })}
              </div>

              {/* Custom text input */}
              <div className="flex gap-2 mb-4">
                <input
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canProceed && handleNext()}
                  placeholder="Or type your own..."
                  className="flex-1 rounded-xl border border-[#E8E4DF] bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 placeholder:text-[#B0AAA4]"
                />
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => { if (currentStep > 0) { setCurrentStep(currentStep - 1); setSelected([]); setCustomInput(""); } }}
                  className={`text-sm text-[#8A8580] hover:text-[#1A1A1A] transition-colors ${currentStep === 0 ? "invisible" : ""}`}
                >
                  ← Back
                </button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="bg-[#1A1A1A] hover:bg-[#333] text-white rounded-xl px-6 disabled:opacity-30"
                >
                  {currentStep + 1 === STEPS.length ? "Review →" : "Next →"}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-white rounded-2xl border border-[#E8E4DF] px-5 py-5 mb-5 shadow-sm">
                <h2 className="font-bold text-[#1A1A1A] text-base mb-3">Your Profile Summary</h2>
                <div className="space-y-2">
                  {[
                    { label: "Rhythm", value: answers.rhythm_type },
                    { label: "Work hours", value: answers.unmovables_work },
                    { label: "Other commitments", value: Array.isArray(answers.unmovables_other) ? answers.unmovables_other.join(", ") : answers.unmovables_other },
                    { label: "Current sleep", value: answers.sleep_actual },
                    { label: "Wake time", value: answers.wake_time },
                    { label: "Sleep goal", value: answers.sleep_goal },
                    { label: "Growth focus", value: Array.isArray(answers.growth_focus) ? answers.growth_focus.join(", ") : answers.growth_focus },
                    { label: "Peak energy", value: answers.energy_pattern },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-start gap-4 text-sm">
                      <span className="text-[#8A8580] flex-shrink-0">{label}</span>
                      <span className="text-[#1A1A1A] font-medium text-right">{value || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setShowConfirm(false); setCurrentStep(0); setSelected([]); }}
                  className="flex-1 rounded-xl border-[#E8E4DF]"
                >
                  Edit Answers
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={saving}
                  className="flex-1 bg-[#7C9A82] hover:bg-[#6B8A71] text-white rounded-xl"
                >
                  {saving ? "Setting up..." : "✨ Build My Grid"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}