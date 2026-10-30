// Keeps the same habit from being suggested or added twice — across sources,
// across sessions, and against routines the user already keeps.

const STOP_WORDS = new Set([
  "the", "a", "an", "my", "your", "of", "to", "for", "and", "in", "on", "with",
  "daily", "every", "each", "day", "week", "weekly", "minutes", "min", "mins",
  "morning", "evening", "night", "a", "do", "some",
]);

export function normalizeHabitTitle(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywords(title) {
  return normalizeHabitTitle(title)
    .split(" ")
    .filter((w) => w && !STOP_WORDS.has(w));
}

// Two titles are the same habit when they read the same, or when their first
// three meaningful words match ("read 10 pages" vs "read 10 pages before bed").
export function isDuplicateHabit(title, existingTitles = []) {
  const words = keywords(title);
  if (!words.length) return false;
  const joined = normalizeHabitTitle(title);
  const signature = words.slice(0, 3).join(" ");

  return existingTitles.some((existing) => {
    const existingJoined = normalizeHabitTitle(existing);
    if (!existingJoined) return false;
    if (existingJoined === joined) return true;
    const existingWords = keywords(existing);
    return existingWords.length > 0 && existingWords.slice(0, 3).join(" ") === signature;
  });
}

// Splits a candidate list into new habits and the ones we've seen before.
export function partitionNewHabits(habits = [], existingTitles = []) {
  const seen = [...existingTitles];
  const fresh = [];
  const duplicates = [];
  habits.forEach((habit) => {
    if (isDuplicateHabit(habit.title, seen)) {
      duplicates.push(habit.title);
    } else {
      fresh.push(habit);
      seen.push(habit.title);
    }
  });
  return { fresh, duplicates };
}