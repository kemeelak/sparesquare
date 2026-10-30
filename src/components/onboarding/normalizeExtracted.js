// People write in whatever shape feels natural — "9am", "around midnight", "Mon–Fri".
// The onboarding model hands back what it heard, so every value gets cleaned into the
// exact shape the profile and the grid expect here. One odd value is dropped instead of
// breaking the whole turn, and anything already captured is never wiped out.

const JUNK = new Set(["", "null", "undefined", "none", "n/a", "na", "unknown", "not mentioned", "not sure"]);

const DAY_LOOKUP = {
  mon: "monday", monday: "monday",
  tue: "tuesday", tues: "tuesday", tuesday: "tuesday",
  wed: "wednesday", weds: "wednesday", wednesday: "wednesday",
  thu: "thursday", thur: "thursday", thurs: "thursday", thursday: "thursday",
  fri: "friday", friday: "friday",
  sat: "saturday", saturday: "saturday",
  sun: "sunday", sunday: "sunday",
};
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const RHYTHM_ALIASES = {
  night_shift: ["night shift", "nightshift", "nights", "overnight", "graveyard"],
  student: ["student", "school", "college", "university", "class", "studying"],
  parent: ["parent", "stay at home", "stay-at-home", "mom", "dad", "kids", "childcare"],
  freelancer: ["freelance", "self employ", "self-employ", "entrepreneur", "own business", "contractor"],
  nine_to_five: ["9-5", "9 to 5", "nine to five", "office", "corporate", "full time", "full-time", "day job", "shift"],
  other: [],
};

const GROWTH_ALIASES = {
  fitness: ["fit", "fitness", "health", "gym", "workout", "exercise", "body", "strength", "weight", "run"],
  business: ["business", "career", "money", "financial", "income", "startup", "start up", "company", "promotion"],
  peace: ["peace", "mind", "calm", "stress", "anxiety", "meditat", "mental", "balance", "rest"],
  learning: ["learn", "read", "study", "skill", "course", "knowledge", "language", "school"],
  creativity: ["creat", "art", "music", "writ", "design", "paint", "build things"],
  relationships: ["relationship", "family", "friend", "love", "partner", "social", "connection"],
};

function cleanText(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || JUNK.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

function cleanList(value) {
  if (typeof value === "string") {
    return value
      .split(/[,;\n]/)
      .map((part) => cleanText(part))
      .filter(Boolean);
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? cleanText(item) : null))
    .filter(Boolean);
}

function clampToDay(hour) {
  if (!Number.isFinite(hour)) return null;
  return hour >= 0 && hour <= 24 ? hour : null;
}

// Returns the exact hour with decimals kept. `evening` nudges an ambiguous bare number
// ("around 10" for bedtime) into the evening.
function cleanHour(value, evening = false) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return clampToDay(value);
  const raw = String(value).toLowerCase().trim();
  if (!raw) return null;
  if (raw.includes("midnight")) return 0;
  if (raw.includes("noon")) return 12;
  const match = raw.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const suffix = match[3] || "";
  if (suffix.startsWith("p") && hour < 12) hour += 12;
  if (suffix.startsWith("a") && hour === 12) hour = 0;
  if (!suffix && evening && hour >= 6 && hour <= 11) hour += 12;
  return clampToDay(hour + minutes / 60);
}

// Sleep and wake times are shown as whole hours; a block covers whole grid squares.
function roundHour(value, evening = false) {
  const hour = cleanHour(value, evening);
  if (hour === null) return null;
  const rounded = Math.round(hour);
  return rounded >= 0 && rounded <= 24 ? rounded : null;
}

function cleanDays(value) {
  const out = new Set();
  cleanList(value).forEach((item) => {
    const key = item.toLowerCase().replace(/[^a-z]/g, "");
    if (!key) return;
    if (key.startsWith("everyday") || key === "daily" || key === "alldays" || key === "anyday") {
      out.clear();
      out.add("*");
      return;
    }
    if (key.startsWith("weekday")) {
      WEEKDAYS.forEach((day) => out.add(day));
      return;
    }
    if (key.startsWith("weekend")) {
      out.add("saturday");
      out.add("sunday");
      return;
    }
    if (key.includes("mon") && key.includes("fri")) {
      WEEKDAYS.forEach((day) => out.add(day));
      return;
    }
    const day = DAY_LOOKUP[key] || DAY_LOOKUP[key.replace(/s$/, "")];
    if (day) out.add(day);
  });
  if (out.has("*")) return []; // an empty days list means every day, by the app's convention
  return Array.from(out);
}

function cleanUnmovables(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const label = cleanText(item.label);
      const startRaw = cleanHour(item.start_hour);
      const endRaw = cleanHour(item.end_hour);
      if (!label || startRaw === null || endRaw === null) return null;
      const start = Math.floor(startRaw);
      const end = Math.ceil(endRaw);
      if (end <= start) return null;
      return { label, start_hour: start, end_hour: end, days: cleanDays(item.days) };
    })
    .filter(Boolean);
}

function pickEnum(value, aliases) {
  const text = cleanText(value)?.toLowerCase();
  if (!text) return null;
  const direct = Object.keys(aliases).find((key) => key === text);
  if (direct) return direct;
  for (const [canonical, words] of Object.entries(aliases)) {
    if (words.some((word) => text.includes(word))) return canonical;
  }
  return null;
}

// If the model words the rhythm its own way ("night owl, office till 6"), fall back to
// what their fixed blocks say — weekday daytime work is a 9-to-5 life.
function inferRhythm(unmovables) {
  const weekdayWork = unmovables.some(
    (block) =>
      block.start_hour <= 11 &&
      block.end_hour >= 15 &&
      WEEKDAYS.some((day) => block.days.includes(day))
  );
  return weekdayWork ? "nine_to_five" : null;
}

export function normalizeExtracted(raw) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};

  const unmovables = cleanUnmovables(raw.unmovables);
  if (unmovables.length) out.unmovables = unmovables;

  const rhythm = pickEnum(raw.rhythm_type, RHYTHM_ALIASES) || inferRhythm(unmovables);
  if (rhythm) out.rhythm_type = rhythm;

  const growth = pickEnum(raw.growth_focus, GROWTH_ALIASES);
  if (growth) out.growth_focus = Array.isArray(raw.growth_focus)
    ? pickEnum(raw.growth_focus[0], GROWTH_ALIASES) || growth
    : growth;

  const habits = cleanList(raw.existing_habits);
  if (habits.length) out.existing_habits = habits;

  const goals = cleanList(raw.goals);
  if (goals.length) out.goals = goals;

  const challenges = cleanList(raw.challenges);
  if (challenges.length) out.challenges = challenges;

  const sleep = roundHour(raw.sleep_hour, true);
  if (sleep !== null) out.sleep_hour = sleep;

  const wake = roundHour(raw.wake_hour);
  if (wake !== null) out.wake_hour = wake;

  const sleepGoal = roundHour(raw.sleep_goal_hour, true);
  if (sleepGoal !== null) out.sleep_goal_hour = sleepGoal;

  const motivation = cleanText(raw.motivation);
  if (motivation) out.motivation = motivation;

  const energy = cleanText(raw.energy_pattern);
  if (energy) out.energy_pattern = energy;

  const partner = cleanText(raw.partner_name);
  if (partner) out.partner_name = partner.slice(0, 12);

  const username = cleanText(raw.username)?.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
  if (username) out.username = username.slice(0, 20);

  return out;
}

// What actually has to be true before we can build someone's grid. Everything else
// (fixed blocks, existing habits, partner name, username) has a sensible default, so a
// long answer that covers the essentials shouldn't force them through more questions.
export function isOnboardingComplete(fields) {
  if (!fields) return false;
  const hours = [fields.sleep_hour, fields.wake_hour, fields.sleep_goal_hour];
  return Boolean(
    fields.rhythm_type &&
      fields.growth_focus &&
      hours.every((hour) => typeof hour === "number") &&
      (fields.goals || []).length > 0 &&
      fields.motivation
  );
}