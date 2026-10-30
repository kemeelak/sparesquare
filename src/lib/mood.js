export const MOODS = [
  { score: 1, label: "Drained", emoji: "😮‍💨" },
  { score: 2, label: "Low", emoji: "😕" },
  { score: 3, label: "Steady", emoji: "🙂" },
  { score: 4, label: "Good", emoji: "😄" },
  { score: 5, label: "Charged", emoji: "⚡" },
];

export const moodEmoji = (mood) =>
  MOODS.find((m) => m.score === mood?.score)?.emoji || "🙂";