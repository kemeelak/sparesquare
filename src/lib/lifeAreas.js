import { differenceInCalendarDays, parseISO, subDays, format } from "date-fns";

// The five buckets a person pours their hours into. A habit's category says what
// the habit is; its life area says whose time it is.
export const WEEKLY_HOURS = 7;

export const LIFE_AREAS = [
  { key: "work", label: "Work", short: "Work", emoji: "💼", color: "#4A5568", tint: "#E2E8F0" },
  { key: "people", label: "Friends & family", short: "People", emoji: "🤝", color: "#C77D8A", tint: "#F7E9EC" },
  { key: "faith", label: "Faith", short: "Faith", emoji: "🕯️", color: "#8B7BB8", tint: "#EDE9F6" },
  { key: "fun", label: "Fun", short: "Fun", emoji: "🎈", color: "#D4A574", tint: "#F5EDE4" },
  { key: "health", label: "Health", short: "Health", emoji: "🌿", color: "#7C9A82", tint: "#E8F0EA" },
];

export const AREA_KEYS = LIFE_AREAS.map((a) => a.key);

export const areaMeta = (key) => LIFE_AREAS.find((a) => a.key === key) || LIFE_AREAS[0];

export const CATEGORY_EMOJI = {
  fitness: "🏃",
  mindfulness: "🧘",
  learning: "📚",
  nutrition: "🥗",
  sleep: "😴",
  productivity: "⚡",
  social: "👥",
  creative: "🎨",
};

// A habit with no life area of its own borrows one from its category.
const CATEGORY_AREA = {
  fitness: "health",
  nutrition: "health",
  sleep: "health",
  mindfulness: "faith",
  social: "people",
  creative: "fun",
  learning: "work",
  productivity: "work",
};

// A title often says more than the category — a prayer habit filed under fitness
// still belongs to faith.
const TITLE_HINTS = [
  { area: "faith", words: ["pray", "prostrat", "church", "bible", "quran", "scripture", "worship", "devotion", "salah", "mass", "medit", "gratitude"] },
  { area: "people", words: ["mom", "dad", "family", "friend", "wife", "husband", "kids", "date night", "dinner with", "coffee with", "call "] },
  { area: "health", words: ["walk", "run", "gym", "workout", "stretch", "yoga", "steps", "sleep", "water", "meal", "lift", "doctor"] },
  { area: "fun", words: ["play", "hobby", "guitar", "game", "draw", "paint", "music", "fiction", "movie"] },
  { area: "work", words: ["email", "deep work", "client", "invoice", "meeting", "study", "review", "project", "plan ", "write "] },
];

export function areaOf(habit) {
  if (habit?.life_area && AREA_KEYS.includes(habit.life_area)) return habit.life_area;
  const title = (habit?.title || "").toLowerCase();
  const hinted = TITLE_HINTS.find(({ words }) => words.some((w) => title.includes(w)));
  if (hinted) return hinted.area;
  return CATEGORY_AREA[habit?.category] || "work";
}

const BASE_MIX = { work: 25, health: 25, people: 20, fun: 15, faith: 15 };

const FOCUS_BOOST = {
  fitness: "health",
  business: "work",
  peace: "faith",
  learning: "work",
  creativity: "fun",
  relationships: "people",
};

const KEYWORDS = {
  people: ["friend", "family", "wife", "husband", "partner", "kid", "child", "mom", "dad", "parent", "sister", "brother", "relationship", "lonely", "marriage", "date night"],
  faith: ["god", "faith", "church", "pray", "bible", "jesus", "spiritual", "meditat", "religio", "gratitude", "soul"],
  fun: ["fun", "hobby", "joy", "play", "game", "music", "creative", "travel", "adventure", "burnout", "bored", "happiness"],
  health: ["health", "sleep", "gym", "weight", "fitness", "run", "eat", "diet", "energy", "tired", "stress", "body", "doctor", "sick"],
  work: ["work", "career", "job", "business", "money", "income", "client", "study", "learn", "exam", "school", "launch", "promotion"],
};

// How much each bucket pulls for them, heard in their own words, becomes a split that
// adds to 100. Nothing said means nothing to go on — the caller keeps what it had.
const QUIET_PULL = 2;

export function mixFromWeights(weights) {
  const pulls = {};
  AREA_KEYS.forEach((key) => {
    const pull = Math.max(0, Number(weights?.[key]) || 0);
    if (pull > 0) pulls[key] = pull;
  });
  if (!Object.keys(pulls).length) return null;

  // A bucket they never mentioned isn't meant to get none of their week — it just isn't
  // what's pulling right now, so it keeps a quiet floor instead of being zeroed out.
  const pullOf = (key) => pulls[key] ?? QUIET_PULL;
  const total = AREA_KEYS.reduce((sum, key) => sum + pullOf(key), 0);
  const mix = {};
  AREA_KEYS.forEach((key) => {
    mix[key] = Math.round((pullOf(key) / total) * 100);
  });
  return mix;
}

// What their hours *should* look like, from what they told us they're working on.
// Not equal fifths — the shares follow their own words. The split they let slip during
// onboarding is the truest thing we have, so it wins over anything inferred later.
export function buildMix(profile) {
  const saved = mixFromWeights(profile?.bucket_mix);
  if (saved) return saved;

  const scores = { ...BASE_MIX };

  const focuses = (profile?.growth_focuses?.length ? profile.growth_focuses : [profile?.growth_focus]).filter(Boolean);
  focuses.forEach((f) => {
    if (FOCUS_BOOST[f]) scores[FOCUS_BOOST[f]] += 9;
  });

  const said = [
    ...(profile?.goals || []),
    ...(profile?.challenges || []),
    profile?.motivation,
    ...(profile?.extra_notes || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  Object.entries(KEYWORDS).forEach(([area, words]) => {
    const hits = words.filter((w) => said.includes(w)).length;
    if (hits) scores[area] += Math.min(12, hits * 4);
  });

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const mix = {};
  Object.entries(scores).forEach(([key, value]) => {
    mix[key] = Math.round((value / total) * 100);
  });
  return mix;
}

const round1 = (n) => Math.round(n * 10) / 10;

export function computeBalance(habits, profile, windowDays = 7) {
  const mix = buildMix(profile);
  const today = new Date();
  const cutoff = format(subDays(today, windowDays - 1), "yyyy-MM-dd");

  const done = habits.filter(
    (h) => h.status === "completed" && h.scheduled_date && h.scheduled_date >= cutoff
  );

  const hoursBy = {};
  const doneCountBy = {};
  AREA_KEYS.forEach((k) => {
    hoursBy[k] = 0;
    doneCountBy[k] = 0;
  });
  done.forEach((h) => {
    const area = areaOf(h);
    hoursBy[area] += (h.duration_minutes || 30) / 60;
    doneCountBy[area] += 1;
  });

  const lastBy = {};
  habits
    .filter((h) => h.status === "completed" && h.scheduled_date)
    .forEach((h) => {
      const area = areaOf(h);
      if (!lastBy[area] || h.scheduled_date > lastBy[area]) lastBy[area] = h.scheduled_date;
    });

  const buckets = LIFE_AREAS.map((area) => {
    const share = mix[area.key] || 0;
    const target = round1((share / 100) * WEEKLY_HOURS);
    const hours = round1(hoursBy[area.key]);
    return {
      ...area,
      share,
      target,
      hours,
      count: doneCountBy[area.key],
      quietDays: lastBy[area.key] ? differenceInCalendarDays(today, parseISO(lastBy[area.key])) : null,
      progress: target > 0 ? hours / target : 0,
    };
  });

  return {
    buckets,
    totalHours: round1(buckets.reduce((sum, b) => sum + b.hours, 0)),
    doneCount: done.length,
    windowDays,
  };
}

export function balanceHeadline({ buckets, doneCount }) {
  if (!doneCount) return "Nothing logged this week yet. Complete one block and these bottles start filling.";

  const strongest = [...buckets].sort((a, b) => b.hours - a.hours)[0];
  const empties = buckets.filter((b) => b.hours === 0);
  const quiet = empties.length
    ? empties.sort((a, b) => (b.quietDays ?? 9999) - (a.quietDays ?? 9999))[0]
    : [...buckets].sort((a, b) => (b.quietDays ?? -1) - (a.quietDays ?? -1))[0];

  if (!quiet) return `${strongest.label} is carrying this week.`;
  if (quiet.key === strongest.key) return `${strongest.label} is the only bucket that moved this week.`;

  const gap = quiet.quietDays
    ? `${quiet.label} hasn't had time in ${quiet.quietDays} days`
    : `${quiet.label} is empty`;

  return `${strongest.label} is carrying this week. ${gap}.`;
}

// One line for the coach, so the balance shows up in conversation too.
export function balanceForPrompt(habits, profile) {
  const { buckets, totalHours } = computeBalance(habits, profile);
  const parts = buckets.map(
    (b) => `${b.label} ${b.hours}h (wants ~${b.target}h)${b.quietDays && b.quietDays > 6 ? `, quiet ${b.quietDays}d` : ""}`
  );
  return `BALANCE — hours in each life bucket over the last 7 days, with the split their own goals suggest (not meant to be equal):\n${parts.join(" · ")}\nTotal logged: ${totalHours}h.`;
}