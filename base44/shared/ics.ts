// Read-only .ics feed support (iCloud / Apple Calendar public share links, or any .ics URL).
// Turns a calendar feed into the same day-block shape getCalendarEvents returns for Google.

const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const DAY_MS = 86400000;

const pad = (n) => String(n).padStart(2, "0");

function dayNumber(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

function fromDayNumber(n) {
  const dt = new Date(n * DAY_MS);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return WEEKDAY_CODES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function unescapeText(value) {
  return value.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

// 20261030 (all day) or 20261030T090000 / 20261030T130000Z (timed)
function parseDateValue(raw) {
  const value = (raw || "").trim();
  const dateOnly = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    return { date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`, hour: 0, minute: 0, allDay: true };
  }
  const stamp = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!stamp) return null;
  const [, y, mo, d, h, mi, s, z] = stamp;
  if (z) {
    const local = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)));
    return {
      date: `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`,
      hour: local.getHours(),
      minute: local.getMinutes(),
      allDay: false
    };
  }
  return { date: `${y}-${mo}-${d}`, hour: Number(h), minute: Number(mi), allDay: false };
}

function parseEvents(icsText) {
  const lines = icsText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");

  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = { exdates: [] };
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    const split = line.indexOf(":");
    if (split === -1) continue;
    const key = line.slice(0, split).split(";")[0].toUpperCase();
    const value = line.slice(split + 1);

    if (key === "SUMMARY") current.summary = unescapeText(value);
    else if (key === "DTSTART") current.start = parseDateValue(value);
    else if (key === "DTEND") current.end = parseDateValue(value);
    else if (key === "RRULE") current.rrule = value;
    else if (key === "EXDATE") {
      value.split(",").forEach((part) => {
        const parsed = parseDateValue(part);
        if (parsed) current.exdates.push(parsed.date);
      });
    } else if (key === "STATUS") current.status = value.toUpperCase();
  }

  return events.filter((e) => e.start && e.status !== "CANCELLED");
}

function occursOn(event, target) {
  const base = event.start.date;
  if (target < base) return false;
  if (event.exdates.includes(target)) return false;
  if (!event.rrule) return base === target;

  const rule = event.rrule;
  const freq = (rule.match(/FREQ=([A-Z]+)/) || [])[1] || "WEEKLY";
  const interval = Number((rule.match(/INTERVAL=(\d+)/) || [])[1] || 1) || 1;
  const byday = ((rule.match(/BYDAY=([^;]+)/) || [])[1] || "")
    .split(",")
    .filter(Boolean)
    .map((code) => code.slice(-2).toUpperCase());
  const count = Number((rule.match(/COUNT=(\d+)/) || [])[1] || 0);
  const untilRaw = (rule.match(/UNTIL=([0-9TZ]+)/) || [])[1];
  const untilParsed = untilRaw ? parseDateValue(untilRaw) : null;
  const until = untilParsed ? untilParsed.date : null;
  if (until && target > until) return false;

  const baseDay = dayNumber(base);
  const targetDay = dayNumber(target);
  if (targetDay - baseDay > 1500) return false;

  const [baseY, baseM, baseD] = base.split("-").map(Number);
  let seen = 0;

  for (let d = baseDay; d <= targetDay; d++) {
    const cur = fromDayNumber(d);
    const diff = d - baseDay;
    let hit = false;

    if (freq === "DAILY") {
      hit = diff % interval === 0;
    } else if (freq === "WEEKLY") {
      const weekOk = Math.floor(diff / 7) % interval === 0;
      hit = weekOk && (byday.length ? byday.includes(weekdayOf(cur)) : weekdayOf(cur) === weekdayOf(base));
    } else if (freq === "MONTHLY") {
      const [curY, curM, curD] = cur.split("-").map(Number);
      hit = curD === baseD && ((curY - baseY) * 12 + (curM - baseM)) % interval === 0;
    } else if (freq === "YEARLY") {
      const [curY, curM, curD] = cur.split("-").map(Number);
      hit = curM === baseM && curD === baseD && (curY - baseY) % interval === 0;
    } else {
      hit = cur === base;
    }

    if (hit) {
      seen += 1;
      if (count && seen > count) return false;
      if (cur === target) return true;
    }
  }

  return false;
}

export function expandIcsEvents(icsText, dateStr) {
  const blocks = [];

  for (const event of parseEvents(icsText || "")) {
    const start = event.start;
    const end = event.end || null;
    const allDay = start.allDay;

    let hit = false;
    if (event.rrule) {
      hit = occursOn(event, dateStr);
    } else if (allDay) {
      const endDate = end ? end.date : start.date;
      hit = dateStr >= start.date && (dateStr < endDate || dateStr === start.date);
    } else {
      hit = start.date === dateStr;
    }
    if (!hit) continue;

    let startHour = 0;
    let endHour = 24;

    if (!allDay) {
      const startMs =
        Date.UTC(...start.date.split("-").map((v, i) => (i === 1 ? Number(v) - 1 : Number(v)))) +
        start.hour * 3600000 +
        start.minute * 60000;
      const endMs = end
        ? Date.UTC(...end.date.split("-").map((v, i) => (i === 1 ? Number(v) - 1 : Number(v)))) +
          end.hour * 3600000 +
          end.minute * 60000
        : startMs + 3600000;
      const minutes = Math.max(15, Math.round((endMs - startMs) / 60000));

      startHour = start.hour;
      endHour = start.hour + Math.max(1, Math.ceil((start.minute + minutes) / 60));
      if (endHour > 24) endHour = 24;
    }

    blocks.push({
      id: `ics-${dateStr}-${blocks.length}`,
      label: event.summary || "Busy",
      emoji: "📅",
      start_hour: startHour,
      end_hour: endHour,
      all_day: allDay
    });
  }

  return blocks.sort((a, b) => a.start_hour - b.start_hour);
}

// iCloud hands out webcal:// links; they are served over https.
export function normalizeFeedUrl(rawUrl) {
  return (rawUrl || "").trim().replace(/^webcal:\/\//i, "https://").replace(/^http:\/\//i, "https://");
}