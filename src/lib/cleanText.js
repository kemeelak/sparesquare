// Speech-to-text and fast typing both leave small messes behind. These are the
// mechanical ones — nothing clever, just what a reader would notice.

const ABBREVIATIONS = /\b(e\.g\.|i\.e\.|etc\.|vs\.)/gi;

const CALENDAR_WORDS =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;

const WORD_FIXES = {
  adn: "and",
  alot: "a lot",
  becuase: "because",
  cant: "can't",
  couldnt: "couldn't",
  definately: "definitely",
  didnt: "didn't",
  doesnt: "doesn't",
  dont: "don't",
  excercise: "exercise",
  havent: "haven't",
  hasnt: "hasn't",
  im: "I'm",
  isnt: "isn't",
  ive: "I've",
  occured: "occurred",
  recieve: "receive",
  seperate: "separate",
  shouldnt: "shouldn't",
  teh: "the",
  thats: "that's",
  thier: "their",
  theyre: "they're",
  tomorow: "tomorrow",
  untill: "until",
  wasnt: "wasn't",
  werent: "weren't",
  wich: "which",
  wont: "won't",
  wouldnt: "wouldn't",
  youre: "you're",
};

export function cleanText(value) {
  if (typeof value !== "string") return "";
  const kept = [];
  let text = value
    // Protect abbreviations so sentence-casing doesn't turn "e.g. run" into "e.g. Run"
    .replace(ABBREVIATIONS, (m) => {
      kept.push(m);
      return `\u0000${kept.length - 1}\u0000`;
    })
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])(?=[A-Za-z])/g, "$1 ")
    .trim();

  // A repeated word is usually a stutter the microphone picked up twice
  text = text.replace(/\b(\w+)(\s+\1)\b/gi, "$1");

  text = text.replace(/\b[a-z']+\b/gi, (word) => {
    const fixed = WORD_FIXES[word.toLowerCase()];
    if (!fixed) return word;
    // Shouting is usually a keyboard accident, not emphasis
    if (word.length > 1 && word === word.toUpperCase()) return fixed;
    const wasCapitalised = word.length > 1 && word[0] === word[0].toUpperCase();
    return wasCapitalised ? fixed[0].toUpperCase() + fixed.slice(1) : fixed;
  });

  text = text.replace(CALENDAR_WORDS, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());

  text = text.replace(/\bi\b/g, "I");
  text = text.replace(/(^|[.!?]\s+)([a-z])/g, (_, lead, letter) => lead + letter.toUpperCase());
  text = text.replace(/\u0000(\d+)\u0000/g, (_, i) => kept[Number(i)]);

  return text.trim();
}

// One note per line, cleaned, with obvious duplicates dropped.
export function cleanList(value) {
  const raw = Array.isArray(value) ? value : String(value || "").split("\n");
  const seen = new Set();
  return raw
    .map(cleanText)
    .filter((line) => {
      if (!line) return false;
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}