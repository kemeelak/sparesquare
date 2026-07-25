import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "../utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

// Initial fixed steps — after these, AI takes over
const INITIAL_STEPS = [
  {
    field: "rhythm_type",
    question: "Welcome to SpareSquare! 👋\n\nI'm your AI growth partner. I'll find hidden time in your day and help you build habits that actually stick.\n\nFirst — what best describes your daily rhythm?",
    chips: ["9-to-5 Worker", "Student", "Night Shift", "Freelancer / Entrepreneur", "Stay-at-home Parent", "Retired", "Other"],
    multi: false,
  },
  {
    field: "unmovables_work",
    question: "Got it. Now let's map your **Unmovables** — blocks that are completely non-negotiable.\n\n**Work / School hours?**",
    chips: ["9am–5pm Mon–Fri", "8am–4pm Mon–Fri", "8am–3pm Mon–Fri", "10am–6pm Mon–Fri", "7am–3pm (early shift)", "3pm–11pm (late shift)", "11pm–7am (night shift)", "Rotating shifts", "Flexible / WFH", "None"],
    multi: false,
    customPlaceholder: "e.g. 6am–2pm Tue–Sat",
  },
  {
    field: "commute",
    question: "Do you commute? How long is your commute one way?",
    chips: ["No commute (WFH)", "Under 15 min", "15–30 min", "30–45 min", "45–60 min", "Over 1 hour"],
    multi: false,
  },
];

// Final steps always appear at the end
const FINAL_STEPS = [
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
    question: "What is the **best version of you** working on? (Pick all that resonate)",
    chips: ["💪 Fitness & Health", "💼 Building a Business", "🧘 Inner Peace / Mindfulness", "📚 Learning & Skills", "🎨 Creativity", "❤️ Relationships", "💰 Financial Freedom"],
    multi: true,
  },
  {
    field: "energy_pattern",
    question: "When do you feel **most energised and focused** during the day?",
    chips: ["Early morning (5–9am)", "Mid-morning (9am–12pm)", "Afternoon (12–5pm)", "Evening (5–9pm)", "Late night (9pm+)", "I'm consistent throughout"],
    multi: false,
  },
  {
    field: "partner_name",
    question: "Almost there! What would you like to **call your AI Partner**?\n\nThis is the name you'll see throughout the app.",
    chips: ["Alex", "Coach", "Sage", "Aria", "Max", "Nova"],
    multi: false,
    customPlaceholder: "Or type your own name... (max 12 chars)",
    maxLength: 12,
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

function buildUnmovablesFromAnswers(answers) {
  const blocks = [];
  const allDays = ["monday","tuesday","wednesday","thursday","friday"];

  const workMap = {
    "9am–5pm Mon–Fri":     { start: 9,  end: 17, days: allDays, label: "Work" },
    "8am–4pm Mon–Fri":     { start: 8,  end: 16, days: allDays, label: "Work" },
    "8am–3pm Mon–Fri":     { start: 8,  end: 15, days: allDays, label: "School" },
    "10am–6pm Mon–Fri":    { start: 10, end: 18, days: allDays, label: "Work" },
    "7am–3pm (early shift)":  { start: 7,  end: 15, days: allDays, label: "Work" },
    "3pm–11pm (late shift)":  { start: 15, end: 23, days: allDays, label: "Work" },
    "11pm–7am (night shift)": { start: 23, end: 7,  days: allDays, label: "Work" },
  };

  const workAnswer = answers.unmovables_work;
  if (workMap[workAnswer]) {
    const w = workMap[workAnswer];
    blocks.push({ label: w.label, start_hour: w.start, end_hour: w.end, days: w.days });
  } else if (workAnswer && !["Flexible / WFH", "None", "Rotating shifts"].includes(workAnswer)) {
    const timeMatch = workAnswer.match(/(\d+)(?::(\d+))?\s*(am|pm)?\s*[–\-to]+\s*(\d+)(?::(\d+))?\s*(am|pm)?/i);
    if (timeMatch) {
      let start = parseInt(timeMatch[1]);
      let end = parseInt(timeMatch[4]);
      if (timeMatch[3]?.toLowerCase() === "pm" && start !== 12) start += 12;
      if (timeMatch[6]?.toLowerCase() === "pm" && end !== 12) end += 12;
      blocks.push({ label: "Work", start_hour: start, end_hour: end, days: allDays });
    }
  }

  // Add commute
  const commuteAnswer = answers.commute;
  if (commuteAnswer && commuteAnswer !== "No commute (WFH)" && commuteAnswer !== "Under 15 min" && blocks.length > 0) {
    const workBlock = blocks[0];
    if (workBlock.start_hour > 0) {
      blocks.push({ label: "Commute (morning)", start_hour: workBlock.start_hour - 1, end_hour: workBlock.start_hour, days: workBlock.days });
    }
    if (workBlock.end_hour < 23) {
      blocks.push({ label: "Commute (evening)", start_hour: workBlock.end_hour, end_hour: workBlock.end_hour + 1, days: workBlock.days });
    }
  }

  // Parse any AI-generated followup unmovable answers
  Object.entries(answers).forEach(([key, value]) => {
    if (!key.startsWith("followup_") || !value) return;
    const label = key.replace("followup_", "").replace(/_/g, " ");
    const timeMatch = (typeof value === "string") && value.match(/(\d+)(?::(\d+))?\s*(am|pm)?\s*[–\-to]+\s*(\d+)(?::(\d+))?\s*(am|pm)?/i);
    if (timeMatch) {
      let start = parseInt(timeMatch[1]);
      let end = parseInt(timeMatch[4]);
      if (timeMatch[3]?.toLowerCase() === "pm" && start !== 12) start += 12;
      if (timeMatch[6]?.toLowerCase() === "pm" && end !== 12) end += 12;
      blocks.push({ label, start_hour: start, end_hour: end, days: allDays });
    }
  });

  return blocks;
}

async function generateNextQuestion(answers, questionHistory) {
  const answeredSummary = Object.entries(answers)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
    .join("\n");

  const askedFields = questionHistory.map(q => q.field).join(", ");

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are conducting a personalized onboarding for a productivity app called SpareSquare. 
    
The user has already answered these questions:
${answeredSummary}

Questions already asked (do NOT repeat these fields): ${askedFields}

Based on what we know, generate ONE highly personalized follow-up question to better understand this specific user's schedule, constraints, or lifestyle. 

The question should:
- Dig deeper into something specific they mentioned
- Help us understand hidden time blockers or opportunities
- Be conversational and empathetic
- NOT repeat anything already asked
- Be relevant to THEIR specific rhythm/life situation

Fields we still need to eventually ask (pick the most relevant ONE for now, or ask something more specific):
- unmovables_other (other regular commitments)
- Any specific schedule details relevant to their rhythm type

Return a JSON object with:
{
  "field": "unique_field_name_snake_case",
  "question": "The question text in markdown",
  "chips": ["option1", "option2", "option3", "option4"],
  "multi": false,
  "customPlaceholder": "optional placeholder text"
}

Make chips specific and relevant. If it's about time, include actual time options. Return ONLY the JSON object, nothing else.`,
    response_json_schema: {
      type: "object",
      properties: {
        field: { type: "string" },
        question: { type: "string" },
        chips: { type: "array", items: { type: "string" } },
        multi: { type: "boolean" },
        customPlaceholder: { type: "string" }
      }
    }
  });
  return result;
}

export default function Onboarding() {
  const [phase, setPhase] = useState("initial"); // "initial" | "ai" | "final" | "confirm"
  const [initialStep, setInitialStep] = useState(0);
  const [aiQuestions, setAiQuestions] = useState([]); // AI-generated questions
  const [aiStep, setAiStep] = useState(0); // which AI question we're on
  const [finalStep, setFinalStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState([]);
  const [customInput, setCustomInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatingQuestion, setGeneratingQuestion] = useState(false);
  const containerRef = useRef(null);

  const MAX_AI_QUESTIONS = 3; // How many AI follow-ups to generate

  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase, initialStep, aiStep, finalStep]);

  // Determine current step object
  const getCurrentStep = () => {
    if (phase === "initial") return INITIAL_STEPS[initialStep];
    if (phase === "ai") return aiQuestions[aiStep] || null;
    if (phase === "final") return FINAL_STEPS[finalStep];
    return null;
  };

  const step = getCurrentStep();

  // Total steps for progress bar (approximate)
  const totalSteps = INITIAL_STEPS.length + MAX_AI_QUESTIONS + FINAL_STEPS.length;
  const currentGlobalStep = phase === "initial" ? initialStep
    : phase === "ai" ? INITIAL_STEPS.length + aiStep
    : phase === "final" ? INITIAL_STEPS.length + aiQuestions.length + finalStep
    : totalSteps;

  const toggleChip = (chip) => {
    if (!step?.multi) {
      setSelected([chip]);
    } else {
      setSelected((prev) =>
        prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
      );
    }
  };

  const saveAnswer = () => {
    if (!step) return {};
    const value = selected.length > 0
      ? (step.multi ? selected : selected[0])
      : customInput.trim() || null;
    if (!value) return null;
    const newAnswers = { ...answers, [step.field]: value };
    setAnswers(newAnswers);
    setSelected([]);
    setCustomInput("");
    return newAnswers;
  };

  const handleNext = async () => {
    const newAnswers = saveAnswer();
    if (!newAnswers) return;

    if (phase === "initial") {
      if (initialStep + 1 < INITIAL_STEPS.length) {
        setInitialStep(initialStep + 1);
      } else {
        // Transition to AI phase — generate first question
        setPhase("ai");
        setGeneratingQuestion(true);
        try {
          const q = await generateNextQuestion(newAnswers, INITIAL_STEPS);
          setAiQuestions([q]);
          setGeneratingQuestion(false);
        } catch (e) {
          // If AI fails, skip straight to final steps
          setGeneratingQuestion(false);
          setPhase("final");
        }
      }
    } else if (phase === "ai") {
      if (aiStep + 1 < MAX_AI_QUESTIONS) {
        setAiStep(aiStep + 1);
        // Generate next AI question
        setGeneratingQuestion(true);
        try {
          const allAsked = [...INITIAL_STEPS, ...aiQuestions.slice(0, aiStep + 1)];
          const q = await generateNextQuestion(newAnswers, allAsked);
          setAiQuestions(prev => [...prev, q]);
          setGeneratingQuestion(false);
        } catch (e) {
          // If AI fails, skip to final steps
          setGeneratingQuestion(false);
          setPhase("final");
        }
      } else {
        // Move to final steps
        setPhase("final");
      }
    } else if (phase === "final") {
      if (finalStep + 1 < FINAL_STEPS.length) {
        setFinalStep(finalStep + 1);
      } else {
        setPhase("confirm");
      }
    }
  };

  const handleBack = () => {
    if (phase === "initial" && initialStep > 0) {
      setInitialStep(initialStep - 1);
    } else if (phase === "ai" && aiStep > 0) {
      setAiStep(aiStep - 1);
    } else if (phase === "ai" && aiStep === 0) {
      setPhase("initial");
      setInitialStep(INITIAL_STEPS.length - 1);
    } else if (phase === "final" && finalStep > 0) {
      setFinalStep(finalStep - 1);
    } else if (phase === "final" && finalStep === 0) {
      setPhase("ai");
      setAiStep(aiQuestions.length - 1);
    }
    setSelected([]);
    setCustomInput("");
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
    const primaryGrowth = GROWTH_MAP[growthFocuses?.[0]] || "learning";
    const unmovables = buildUnmovablesFromAnswers(answers);

    // Generate AI backlog suggestions based on onboarding answers
    const profileSummary = Object.entries(answers)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");

    const backlogSuggestions = await base44.integrations.Core.InvokeLLM({
      prompt: `Based on this user's onboarding profile, suggest 5 highly personalized habit blocks for their backlog. These should be specific, actionable, and deeply relevant to their life situation.

User profile:
${profileSummary}

Return 5 habits as a JSON array with fields: title, description, duration_minutes (15-60), energy_level (low/medium/high), category (fitness/mindfulness/learning/nutrition/sleep/productivity/social/creative), frequency (daily/weekly).`,
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
                frequency: { type: "string" }
              }
            }
          }
        }
      }
    });

    await base44.entities.UserProfile.create({
      rhythm_type: RHYTHM_MAP[answers.rhythm_type] || "other",
      unmovables,
      sleep_actual: toTimeStr(sleepH),
      sleep_goal: toTimeStr(goalH),
      wake_time: toTimeStr(wakeH),
      growth_focus: primaryGrowth,
      onboarding_complete: true,
      timezone_offset: new Date().getTimezoneOffset() / -60,
      partner_name: answers.partner_name || "Partner",
    });

    // Add AI-suggested habits to backlog
    if (backlogSuggestions?.habits?.length > 0) {
      await base44.entities.HabitBlock.bulkCreate(
        backlogSuggestions.habits.map(h => ({
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

  const canProceed = selected.length > 0 || customInput.trim().length > 0;
  const isLastStep = phase === "final" && finalStep === FINAL_STEPS.length - 1;

  const progressPct = Math.round((currentGlobalStep / totalSteps) * 100);

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
        {phase !== "confirm" && (
          <div className="mb-6">
            <div className="h-1.5 bg-[#E8E4DF] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#1A1A1A] rounded-full"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="text-xs text-[#B0AAA4] mt-1 text-right">{progressPct}% complete</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Generating AI question loader */}
          {generatingQuestion && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-[#E8E4DF] px-5 py-8 text-center shadow-sm"
            >
              <Sparkles className="w-8 h-8 text-[#D4A574] mx-auto mb-3 animate-pulse" />
              <p className="text-sm font-medium text-[#1A1A1A]">Personalising your questions...</p>
              <p className="text-xs text-[#8A8580] mt-1">Based on what you've told me</p>
            </motion.div>
          )}

          {/* Question step */}
          {!generatingQuestion && step && phase !== "confirm" && (
            <motion.div
              key={`${phase}-${phase === "initial" ? initialStep : phase === "ai" ? aiStep : finalStep}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              {/* AI badge for AI-generated questions */}
              {phase === "ai" && (
                <div className="flex items-center gap-1.5 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4A574]" />
                  <span className="text-xs font-medium text-[#D4A574]">Personalised for you</span>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-[#E8E4DF] px-5 py-4 mb-4 shadow-sm">
                <div className="text-sm leading-relaxed text-[#1A1A1A] prose prose-sm max-w-none prose-p:my-1">
                  <ReactMarkdown>{step.question}</ReactMarkdown>
                </div>
                {step.multi && <p className="text-xs text-[#B0AAA4] mt-2">Select all that apply</p>}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {step.chips?.map((chip) => {
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

              <div className="flex gap-2 mb-4">
                <input
                  value={customInput}
                  onChange={(e) => setCustomInput(step.maxLength ? e.target.value.slice(0, step.maxLength) : e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canProceed && handleNext()}
                  placeholder={step.customPlaceholder || "Or type your own..."}
                  className="flex-1 rounded-xl border border-[#E8E4DF] bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 placeholder:text-[#B0AAA4]"
                />
                {step.maxLength && customInput.length > 0 && (
                  <span className="flex items-center text-xs text-[#B0AAA4] flex-shrink-0">{customInput.length}/{step.maxLength}</span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={handleBack}
                  className={`text-sm text-[#8A8580] hover:text-[#1A1A1A] transition-colors ${phase === "initial" && initialStep === 0 ? "invisible" : ""}`}
                >
                  ← Back
                </button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="bg-[#1A1A1A] hover:bg-[#333] text-white rounded-xl px-6 disabled:opacity-30"
                >
                  {isLastStep ? "Review →" : "Next →"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Confirm screen */}
          {phase === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-white rounded-2xl border border-[#E8E4DF] px-5 py-5 mb-5 shadow-sm">
                <h2 className="font-bold text-[#1A1A1A] text-base mb-1">Your Profile Summary</h2>
                <p className="text-xs text-[#8A8580] mb-4">We'll also add 5 personalised habits to your backlog ✨</p>
                <div className="space-y-2">
                  {Object.entries(answers).slice(0, 10).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-start gap-4 text-sm">
                      <span className="text-[#8A8580] flex-shrink-0 capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="text-[#1A1A1A] font-medium text-right">
                        {Array.isArray(value) ? value.join(", ") : value || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setPhase("initial"); setInitialStep(0); setSelected([]); setCustomInput(""); }}
                  className="flex-1 rounded-xl border-[#E8E4DF]"
                >
                  Edit Answers
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={saving}
                  className="flex-1 bg-[#7C9A82] hover:bg-[#6B8A71] text-white rounded-xl"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Building your grid...
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