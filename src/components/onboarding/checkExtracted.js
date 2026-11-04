// The conversation — and especially a long voice dump — hears things imperfectly: a ride
// comes back as a thirteen-hour block, a word gets misheard. These are the checks worth
// stopping for, so we ask before the grid is built on a wrong assumption. Everything else
// is shown on the confirm screen, where it can be corrected.

const GENERIC_MAX_HOURS = 14;

const LABEL_LIMITS = [
  { test: /commut|drive|ride|train|bus|subway|travel|school run/i, max: 3, what: "a commute" },
  { test: /gym|workout|lift|exercise|yoga|run\b|session/i, max: 3, what: "a session" },
  { test: /church|temple|mosque|mass|service|prayer/i, max: 4, what: "a service" },
  { test: /lunch|dinner|breakfast|meal|coffee|break\b/i, max: 3, what: "a meal" },
  { test: /nap|rest|quiet time/i, max: 4, what: "a rest" },
];

export function clockText(hour) {
  const h = ((Math.round(hour) % 24) + 24) % 24;
  const suffix = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${suffix}`;
}

export function checkExtracted(fields = {}) {
  const issues = [];

  (fields.unmovables || []).forEach((block, index) => {
    const span = (block?.end_hour ?? 0) - (block?.start_hour ?? 0);
    if (!(span > 0)) return;
    const limit = LABEL_LIMITS.find((l) => l.test.test(block.label || ""));
    const max = limit ? limit.max : GENERIC_MAX_HOURS;
    if (span <= max) return;
    issues.push({
      key: `block:${index}:${(block.label || "").toLowerCase()}:${block.start_hour}-${block.end_hour}`,
      index,
      message: `${block.label || "That block"} runs ${clockText(block.start_hour)} to ${clockText(
        block.end_hour
      )} — ${span} hours${limit ? `, and ${limit.what} is usually under ${limit.max}` : ""}.`,
    });
  });

  const { sleep_hour: sleep, wake_hour: wake } = fields;
  if (typeof sleep === "number" && typeof wake === "number" && sleep === wake) {
    issues.push({
      key: `sleep:${sleep}`,
      message: `Bedtime and wake-up both came back as ${clockText(wake)}.`,
    });
  }

  return issues;
}

export function issueQuestion(issues) {
  const lines = issues.map((issue) => `• ${issue.message}`).join("\n");
  return `Before I build your grid, one or two things I want to get right:\n\n${lines}\n\nTell me the correct version, or say it's right and I'll keep it.`;
}