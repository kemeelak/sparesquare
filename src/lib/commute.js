import { format } from "date-fns";

export const COMMUTE_MODES = {
  drive: { label: "Driving", emoji: "🚗", canRead: false, canWatch: false },
  transit: { label: "Train or bus", emoji: "🚆", canRead: true, canWatch: true },
  passenger: { label: "Riding along", emoji: "🚙", canRead: true, canWatch: true },
  walk_bike: { label: "Walking or biking", emoji: "🚶", canRead: false, canWatch: false },
};

export const LISTEN_APPS = [
  { value: "spotify", label: "Spotify" },
  { value: "apple_podcasts", label: "Apple Podcasts" },
  { value: "youtube_music", label: "YouTube Music" },
  { value: "youtube", label: "YouTube" },
  { value: "in_app", label: "Right here" },
];

export const READ_APPS = [
  { value: "kindle", label: "Kindle" },
  { value: "audible", label: "Audible" },
  { value: "youtube", label: "YouTube" },
  { value: "none", label: "Nothing to read" },
];

export const FORMAT_OPTIONS = [
  { value: "podcasts", label: "Podcast episodes" },
  { value: "music", label: "Music" },
  { value: "audiobooks", label: "Audiobooks" },
  { value: "video", label: "YouTube & video", needsWatch: true },
  { value: "reading", label: "Articles & reading", needsRead: true },
  { value: "thinking", label: "Thinking drills" },
  { value: "games", label: "Mind games" },
  { value: "voice", label: "Talking it out" },
  { value: "course", label: "Courses & language" },
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

// 30-minute steps, stored as decimal hours (8.5 = 8:30 AM)
export const START_SLOTS = Array.from({ length: 48 }, (_, i) => i / 2);
export const END_SLOTS = Array.from({ length: 48 }, (_, i) => (i + 1) / 2);

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
  // a 8:30 start still touches the 8 o'clock block
  return hour + 1 > commute.start_hour && hour < commute.end_hour;
}

export function minutesLeftInCommute(commute, hour) {
  if (!commute) return 0;
  const from = Math.max(hour, commute.start_hour);
  return Math.max(0, Math.round((commute.end_hour - from) * 60));
}

export function isCommutingNow(commute, now = new Date()) {
  return isCommuteHour(commute, now, now.getHours());
}

export function hourLabel(hour) {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function slotLabel(slot) {
  const whole = Math.floor(slot);
  const minutes = Math.round((slot - whole) * 60);
  const suffix = whole % 24 < 12 ? "AM" : "PM";
  const h = whole % 12 === 0 ? 12 : whole % 12;
  return `${h}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function slotRangeLabel(start, end) {
  return `${slotLabel(start)} – ${slotLabel(end)}`;
}

export function formatsForMode(mode) {
  return FORMAT_OPTIONS.filter((f) => (f.needsRead ? mode.canRead : f.needsWatch ? mode.canWatch : true));
}

export function formatLabels(formats) {
  return (formats || []).map((v) => FORMAT_OPTIONS.find((f) => f.value === v)?.label || v);
}

const APP_LABELS = {};
[...LISTEN_APPS, ...READ_APPS].forEach((a) => {
  APP_LABELS[a.value] = a.label;
});

export function appLabel(value) {
  return APP_LABELS[value] || "your app";
}

const APP_SEARCH = {
  spotify: (q) => `https://open.spotify.com/search/${q}`,
  apple_podcasts: (q) => `https://podcasts.apple.com/us/search?term=${q}`,
  youtube_music: (q) => `https://music.youtube.com/search?q=${q}`,
  youtube: (q) => `https://www.youtube.com/results?search_query=${q}`,
  kindle: (q) => `https://www.amazon.com/s?k=${q}&i=digital-text`,
  audible: (q) => `https://www.audible.com/search?keywords=${q}`,
};

// Opens the suggestion in the app this person actually uses
export function resolveOpen(suggestion, commute) {
  const query = suggestion?.search_query;
  if (!query || suggestion.kind === "do") return null;
  const apps = commute?.apps || {};
  let app;
  if (suggestion.kind === "read") {
    app = apps.reading;
  } else if (suggestion.kind === "watch" || suggestion.platform === "youtube") {
    app = "youtube";
  } else {
    app = apps.audio || (commute?.consumes === "youtube" ? "youtube" : commute?.consumes === "in_app" ? "in_app" : "apple_podcasts");
  }
  const build = APP_SEARCH[app];
  if (!build) return null;
  return { url: build(encodeURIComponent(query)), label: appLabel(app) };
}

export function habitFitsCommute(habit) {
  // Nobody can train while travelling, whatever the mode
  return habit.category !== "fitness";
}