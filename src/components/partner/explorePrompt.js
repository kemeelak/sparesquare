// Going deeper on a dump or one line inside it: the partner looks at it through
// everything else this person has written and read, and can keep going down lap after lap.

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

// Everything already said on the way down, so the next lap cannot repeat it.
function lapsBlock(laps) {
  return (laps || [])
    .map((lap, index) => {
      const threads = (lap.threads || []).map((t) => t.label).join(" / ");
      const move = lap.move?.title ? ` | move offered: ${lap.move.title}` : "";
      return `LAP ${index + 1}\nWhat you saw: ${lap.read || ""}${threads ? `\nThreads used: ${threads}` : ""}${move}`;
    })
    .join("\n\n");
}

export function buildExplorePrompt({ partnerName, subject, context, dumps, sources, laps }) {
  const prior = lapsBlock(laps);
  const deeper = (laps || []).length > 0;

  return `${partnerName} is going back over something this person wrote, because they asked to keep digging into it. ${deeper ? "This is a later lap: they read what came back and pressed to go further." : "This is the first pass."}

WHAT THEY ARE DIGGING INTO (their own words):
"${subject || "(no words, just an attachment)"}"

WHAT CAME BACK TO THEM AT THE TIME:
${context ? `"${context}"` : "(nothing recorded)"}

EVERYTHING ELSE ON THEIR WALL (their own dumps, newest first):
${wallBlock(dumps)}

WHAT IS ON THEIR SHELF (sources they actually read or listened to):
${shelfBlock(sources)}
${prior ? `\nWHAT YOU HAVE ALREADY SAID ON THE WAY DOWN:\n${prior}\n` : ""}
REPLY IN FOUR PARTS. Return only the JSON.

0. read — 2 to 3 sentences, 60 words maximum. What this is actually about, now that you have seen the rest of their wall. ${deeper ? "This lap has to land somewhere the earlier laps did not: the thing underneath what you already named, the part they have not said out loud." : "Plain words, the way someone who knows them would say it across a table."} No restating their line back, no therapy-speak ("it sounds like you're feeling"), no "I hear you", no "that's valid", no advice here, no em dashes, no semicolons, no lists, no headers, no bold. If their wall is nearly empty, work from the line itself and say less, not more.

1. threads — 2 or 3 real connections, each with a label of 5 words or fewer and a detail of one or two sentences. A thread has to point at something that genuinely exists in the material above: another dump of theirs, the same worry showing up twice, a source on their shelf that speaks to it. ${deeper ? "None of these may repeat a thread from an earlier lap. Go sideways into dumps you have not used yet, or further into the source." : ""} Use a shelf thread only when a principle above actually speaks to this, and name the source exactly as written. Never invent a source they have not added, never invent a dump that is not above. If their wall and shelf are nearly empty, return one thread about the line itself rather than padding with guesses.

2. question — one question they probably have not asked themselves. Under 18 words. Specific to their situation, not a therapy prompt, not "how does that make you feel", no question mark stacking. ${deeper ? "Not a question you asked on an earlier lap." : ""} It should be answerable by someone sitting still for a minute.

3. move — the one thing this is pointing at, doable today or tomorrow in under 20 minutes. A title they would recognise on their grid (5 words max), one line of description saying exactly when or how, and minutes as a number. ${deeper ? "A different and slightly braver step than the one you offered before, never the same move again." : ""} Never "journal about it", "reflect on this", "sit with it", "practice self care", "set a boundary". If it is about a person, the move involves that person. If it is about work, it is one real deliverable or one conversation.

Return only the JSON.`;
}

export function buildExploreFollowUp({ partnerName, subject, context, dumps, sources, laps, thread, question }) {
  const said = (thread || [])
    .map((turn) => `THEY ASKED: ${turn.q}\nYOU SAID: ${turn.a}`)
    .join("\n\n");
  const last = (laps || [])[laps.length - 1];

  return `${partnerName} is still going over something this person wrote with them. They read the passes so far and asked something back.

WHAT THEY ARE DIGGING INTO: "${subject || "(no words, just an attachment)"}"
WHAT CAME BACK AT THE TIME: ${context ? `"${context}"` : "(nothing recorded)"}

EVERYTHING ELSE ON THEIR WALL:
${wallBlock(dumps)}

WHAT IS ON THEIR SHELF:
${shelfBlock(sources)}

WHAT ${partnerName} HAS SAID SO FAR:
${last?.read || ""}
${last?.question ? `The question left with them: ${last.question}` : ""}

${said ? `ALREADY SAID IN THIS TRACK:\n${said}\n\n` : ""}THEY NOW ASK:
${question}

Answer in 2 to 4 sentences, 90 words maximum. Say the thing plainly rather than restating the question. Draw on their own wall and their shelf only when it genuinely fits, and name a source exactly as it is written above. If they ask something you cannot know, say what you can actually see instead of guessing. No lists, no headers, no bold, no em dashes, no therapy-speak. Do not offer to do anything you cannot do here.

Return only the reply text.`;
}