import { base44 } from "@/api/base44Client";

// Allowed chip values per field so extracted answers match the existing options exactly
export const CHIP_OPTIONS = {
  rhythm_type: ["9-to-5 Worker", "Student", "Night Shift", "Freelancer / Entrepreneur", "Stay-at-home Parent", "Retired", "Other"],
  unmovables_work: ["9am–5pm Mon–Fri", "8am–4pm Mon–Fri", "8am–3pm Mon–Fri", "10am–6pm Mon–Fri", "7am–3pm (early shift)", "3pm–11pm (late shift)", "11pm–7am (night shift)", "Rotating shifts", "Flexible / WFH", "None"],
  commute: ["No commute (WFH)", "Under 15 min", "15–30 min", "30–45 min", "45–60 min", "Over 1 hour"],
  sleep_actual: ["Before 10pm", "Around 10–10:30pm", "Around 11pm", "Around midnight", "After midnight", "It varies a lot"],
  wake_time: ["Before 5am", "5–6am", "6–7am", "7–8am", "After 8am", "It varies"],
  sleep_goal: ["9–10pm", "10–10:30pm", "10:30–11pm", "11pm–midnight", "Same as now"],
  growth_focus: ["💪 Fitness & Health", "💼 Building a Business", "🧘 Inner Peace / Mindfulness", "📚 Learning & Skills", "🎨 Creativity", "❤️ Relationships", "💰 Financial Freedom"],
  energy_pattern: ["Early morning (5–9am)", "Mid-morning (9am–12pm)", "Afternoon (12–5pm)", "Evening (5–9pm)", "Late night (9pm+)", "I'm consistent throughout"],
};

export async function extractAnswersFromTranscript(transcript) {
  const optionsText = Object.entries(CHIP_OPTIONS)
    .map(([k, v]) => `- ${k}: ${v.map((o) => `"${o}"`).join(" | ")}`)
    .join("\n");

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `A new user of a time-and-habit app just told us about themselves by voice. Extract what they said into structured answers.

Transcript:
"""${transcript}"""

For each field below, ONLY include it if the user clearly said enough to decide. Pick EXACTLY one of the listed options (growth_focus may pick several). If unsure or not mentioned, leave the field out. Never guess.
${optionsText}

Also extract:
- goals: short list of specific things they want help with or want to achieve
- challenges: short list of things that have gotten in their way
- motivation: one sentence on why this matters to them (empty if not said)
- summary: one warm sentence reflecting back what you heard`,
    response_json_schema: {
      type: "object",
      properties: {
        rhythm_type: { type: "string" },
        unmovables_work: { type: "string" },
        commute: { type: "string" },
        sleep_actual: { type: "string" },
        wake_time: { type: "string" },
        sleep_goal: { type: "string" },
        growth_focus: { type: "array", items: { type: "string" } },
        energy_pattern: { type: "string" },
        goals: { type: "array", items: { type: "string" } },
        challenges: { type: "array", items: { type: "string" } },
        motivation: { type: "string" },
        summary: { type: "string" },
      },
    },
  });

  // Keep only values that exactly match an allowed option
  const clean = {};
  Object.entries(CHIP_OPTIONS).forEach(([field, options]) => {
    const v = result?.[field];
    if (field === "growth_focus") {
      const valid = (v || []).filter((x) => options.includes(x));
      if (valid.length) clean[field] = valid;
    } else if (v && options.includes(v)) {
      clean[field] = v;
    }
  });

  return {
    answers: clean,
    goals: result?.goals || [],
    challenges: result?.challenges || [],
    motivation: result?.motivation || "",
    summary: result?.summary || "",
  };
}