// Going deeper on one line of a note: the partner looks at it through everything
// else this person has written and read, instead of only the line in front of it.

export const EXPLORE_SCHEMA = {
  type: "object",
  properties: {
    read: { type: "string" },
    threads: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          detail: { type: "string" },
        },
        required: ["label", "detail"],
      },
    },
    question: { type: "string" },
    move: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        minutes: { type: "number" },
      },
      required: ["title", "description", "minutes"],
    },
  },
  required: ["read", "threads", "question", "move"],
};

// Their whole wall, compressed to the shape that matters for finding a thread.
function wallBlock(dumps) {
  const lines = (dumps || [])
    .filter((d) => d.text || d.title)
    .slice(0, 14)
    .map((d) => {
      const head = d.title ? `"${d.title}"` : "Untitled";
      const back = d.reflection ? ` what came back: ${d.reflection}` : "";
      const move = d.action_title ? ` move: ${d.action_title}` : "";
      return `- ${head}${back}${move}`;
    });
  return lines.length ? lines.join("\n") : "Nothing else on the wall yet.";
}

function shelfBlock(sources) {
  const lines = (sources || [])
    .flatMap((s) => (s.learnings || []).slice(0, 2).map((l) => `- ${s.title}: ${l.principle}`))
    .slice(0, 10);
  return lines.length
    ? lines.join("\n")
    : "Their library is empty. Nothing can come from a book, podcast or video yet.";
}

export function buildExplorePrompt({ partnerName, note, parent, dumps, sources }) {
  return `${partnerName} is not answering a message. This person wrote a note, then piled more onto it, and now they have picked one line out of that thread and asked to look at it properly. They want it read through everything else they have written down and everything they have read.

THE LINE THEY PICKED:
"${note?.text || "(no words, just an attachment)"}"

WHAT THAT LINE SITS INSIDE (their own words on the same note):
${parent?.text ? `"${parent.text}"` : "(no words)"}

EVERYTHING ELSE ON THEIR WALL (their own dumps, newest first):
${wallBlock(dumps)}

WHAT IS ON THEIR SHELF (sources they actually read or listened to):
${shelfBlock(sources)}

REPLY IN FOUR PARTS. Return only the JSON.

0. read — 2 to 3 sentences, 60 words maximum. What this line is actually about, now that you have seen the rest of their wall. Plain words, the way someone who knows them would say it across a table. No restating the line back, no therapy-speak ("it sounds like you're feeling"), no "I hear you", no "that's valid", no advice here, no em dashes, no semicolons, no lists, no headers, no bold. If there is nothing else on their wall, work from the line itself and say less, not more.

1. threads — 2 or 3 real connections, each with a label of 5 words or fewer and a detail of one or two sentences. A thread has to point at something that genuinely exists in the material above: another dump of theirs, the same worry showing up twice, a source on their shelf that speaks to it. Use a shelf thread only when a principle above actually speaks to this, and name the source exactly as written. Never invent a source they have not added, never invent a dump that is not above. If their wall and shelf are nearly empty, return one thread about the line itself rather than padding with guesses.

2. question — one question they probably have not asked themselves about this. Under 18 words. Specific to their situation, not a therapy prompt, not "how does that make you feel", no question mark stacking. It should be answerable by someone sitting still for a minute.

3. move — the one thing this line is pointing at, doable today or tomorrow in under 20 minutes. A title they would recognise on their grid (5 words max), one line of description saying exactly when or how, and minutes as a number. Never "journal about it", "reflect on this", "sit with it", "practice self care", "set a boundary". If the line is about a person, the move involves that person. If it is about work, it is one real deliverable or one conversation.

Return only the JSON.`;
}

export function buildExploreFollowUp({ partnerName, note, parent, dumps, sources, reading, thread, question }) {
  const said = (thread || [])
    .map((turn) => `THEY ASKED: ${turn.q}\nYOU SAID: ${turn.a}`)
    .join("\n\n");

  return `${partnerName} is still going over one line of this person's note with them. They read the first pass and asked something back.

THE LINE: "${note?.text || "(no words, just an attachment)"}"
INSIDE IT: ${parent?.text ? `"${parent.text}"` : "(no words)"}

EVERYTHING ELSE ON THEIR WALL:
${wallBlock(dumps)}

WHAT IS ON THEIR SHELF:
${shelfBlock(sources)}

WHAT ${partnerName} SAID FIRST:
${reading?.read || ""}
${reading?.question ? `The question left with them: ${reading.question}` : ""}

${said ? `ALREADY SAID IN THIS TRACK:\n${said}\n\n` : ""}THEY NOW ASK:
${question}

Answer in 2 to 4 sentences, 90 words maximum. Say the thing plainly rather than restating the question. Draw on their own wall and their shelf only when it genuinely fits, and name a source exactly as it is written above. If they ask something you cannot know, say what you can actually see instead of guessing. No lists, no headers, no bold, no em dashes, no therapy-speak. Do not offer to do anything you cannot do here.

Return only the reply text.`;
}