import { format } from "date-fns";

export const COMMUTE_MODES = {
  drive: { label: "Driving", emoji: "🚗", canRead: false, canWatch: false },
  transit: { label: "Train or bus", emoji: "🚆", canRead: true, canWatch: true },
  passenger: { label: "Riding along", emoji: "🚙", canRead: true, canWatch: true },
  walk_bike: { label: "Walking or biking", emoji: "🚶", canRead: false, canWatch: false },
};

export const CONSUME_OPTIONS = [
  { value: "in_app", label: "Audio right here" },
  { value: "podcasts", label: "My podcast app" },
  { value: "youtube", label: "YouTube" },
  { value: "read", label: "Reading" },
  { value: "nothing", label: "Mostly nothing yet" },
];

export const TOPIC_OPTIONS = [
  "Business & startups",
  "Health & fitness",
  "Mindfulness",
  "Psychology",
  "Money",
  "Learning new skills",
  "Creativity",
  "Faith & meaning",
  "Relationships",
  "Big ideas & stories",
];

export const WEEK_DAYS = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

export function getCommute(profile) {
  const commute = profile?.commute;
  return commute?.enabled ? commute : null;
}

export function commuteMode(commute) {
  return COMMUTE_MODES[commute?.mode] || COMMUTE_MODES.drive;
}

export function isCommuteHour(commute, date, hour) {
  if (!commute?.enabled) return false;
  const day = format(date, "EEEE").toLowerCase();
  if (!commute.days?.includes(day)) return false;
  return hour >= commute.start_hour && hour < commute.end_hour;
}

export function minutesLeftInCommute(commute, hour) {
  if (!commute) return 0;
  return Math.max(0, (commute.end_hour - hour) * 60);
}

export function isCommutingNow(commute, now = new Date()) {
  return isCommuteHour(commute, now, now.getHours());
}

export function hourLabel(hour) {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function consumptionLabel(commute) {
  return CONSUME_OPTIONS.find((o) => o.value === commute?.consumes)?.label || "Whatever is easy";
}

export function habitFitsCommute(habit) {
  // Nobody can train while travelling, whatever the mode
  return habit.category !== "fitness";
}

export function contentLink(platform, query) {
  if (!query) return null;
  const q = encodeURIComponent(query);
  if (platform === "spotify") return `https://open.spotify.com/search/${q}`;
  if (platform === "podcast") return `https://podcasts.apple.com/us/search?term=${q}`;
  if (platform === "youtube") return `https://www.youtube.com/results?search_query=${q}`;
  return null;
}