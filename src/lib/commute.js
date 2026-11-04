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

// The saved morning/evening windows plus any ride started on the spot
export function windowsForDay(commute, sessions = [], date = new Date()) {
  const day = format(date, "EEEE").toLowerCase();
  const dayStr = format(date, "yyyy-MM-dd");
  const windows = [];

  if (commute?.enabled && commute.days?.includes(day)) {
    const mode = commuteMode(commute);
    windows.push({
      key: "out",
      label: "Heading in",
      oneOff: false,
      mode,
      start_hour: commute.start_hour,
      end_hour: commute.end_hour,
    });
    if (commute.return_end_hour > commute.return_start_hour) {
      windows.push({
        key: "back",
        label: "Heading home",
        oneOff: false,
        mode,
        start_hour: commute.return_start_hour,
        end_hour: commute.return_end_hour,
      });
    }
  }

  (sessions || []).forEach((session) => {
    if (!session?.start_time) return;
    const started = new Date(session.start_time);
    if (format(started, "yyyy-MM-dd") !== dayStr) return;
    const start = started.getHours() + started.getMinutes() / 60;
    windows.push({
      key: `ride-${session.id}`,
      label: "On the move",
      oneOff: true,
      mode: COMMUTE_MODES[session.mode] || commuteMode(commute),
      start_hour: start,
      end_hour: start + (session.duration_minutes || 30) / 60,
      session,
    });
  });

  return windows;
}

// A real calendar event beats a saved ride — if they're at work at 8, 8 isn't a commute.
// Windows are trimmed to the hours the calendar leaves free and dropped when nothing is left.
export function trimWindowsToCalendar(windows, blocks = []) {
  const blocked = (blocks || []).filter(
    (b) => typeof b?.start_hour === "number" && typeof b?.end_hour === "number"
  );
  if (blocked.length === 0) return windows || [];

  return (windows || []).flatMap((w) => {
    let segments = [{ start: w.start_hour, end: w.end_hour }];
    blocked.forEach((b) => {
      segments = segments.flatMap((s) => {
        if (b.end_hour <= s.start || b.start_hour >= s.end) return [s];
        const pieces = [];
        if (b.start_hour > s.start) pieces.push({ start: s.start, end: b.start_hour });
        if (b.end_hour < s.end) pieces.push({ start: b.end_hour, end: s.end });
        return pieces;
      });
    });
    return segments
      .filter((s) => s.end > s.start)
      .map((s, i) => ({ ...w, key: i > 0 ? `${w.key}-${i}` : w.key, start_hour: s.start, end_hour: s.end }));
  });
}

// A 8:30 start still touches the 8 o'clock block
export function windowForHour(windows, hour) {
  return (windows || []).find((w) => hour + 1 > w.start_hour && hour < w.end_hour) || null;
}

export function isCommuteHour(commute, date, hour, sessions = []) {
  return !!windowForHour(windowsForDay(commute, sessions, date), hour);
}

// How long a ride has actually been going — used when someone ends it early
export function elapsedMinutes(session, now = new Date()) {
  const started = new Date(session?.start_time).getTime();
  if (!started) return 1;
  return Math.max(1, Math.round((now.getTime() - started) / 60000));
}

export function minutesLeftInWindow(rideWindow, hour) {
  if (!rideWindow) return 0;
  return Math.max(0, Math.round((rideWindow.end_hour - Math.max(hour, rideWindow.start_hour)) * 60));
}

export function isCommutingNow(commute, now = new Date(), sessions = []) {
  return isCommuteHour(commute, now, now.getHours(), sessions);
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

// Rest is a legitimate use of a ride — no lesson required
export function restLink(commute) {
  const app = commute?.apps?.audio || "spotify";
  const build = APP_SEARCH[app];
  if (!build) return null;
  return { url: build(encodeURIComponent("calm playlist to unwind")), label: appLabel(app) };
}

export function habitFitsCommute(habit) {
  // Nobody can train while travelling, whatever the mode
  return habit.category !== "fitness";
}