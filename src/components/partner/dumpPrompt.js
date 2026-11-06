import { format } from "date-fns";
import { bucketSettings } from "@/lib/lifeAreas";

// What comes back after a dump: the few words on the front of the card,
// a reflection, and one move they can actually make.
export const DUMP_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    reflection: { type: "string" },
    library_source: { type: "string" },
    action: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        minutes: { type: "number" },
        category: {
          type: "string",
          enum: ["fitness", "mindfulness", "learning", "nutrition", "sleep", "productivity", "social", "creative"],
        },
        life_area: { type: "string", enum: ["work", "people", "faith", "fun", "health"] },
      },
      required: ["title", "description", "minutes", "category", "life_area"],
    },
  },
  required: ["title", "reflection", "library_source", "action"],
};

export function buildDumpPrompt({ partnerName, profile, text, hasPhoto, sources }) {
  const now = new Date();
  const buckets = bucketSettings(profile)
    .filter((b) => !b.hidden)
    .map((b) => `${b.key} ("${b.label}")`)
    .join(", ");

  const context = [
    profile?.growth_focuses?.length ? `Working on: ${profile.growth_focuses.join(", ")}` : null,
    profile?.energy_pattern ? `Energy: ${profile.energy_pattern}` : null,
    profile?.goals?.length ? `Goals: ${profile.goals.join(", ")}` : null,
    profile?.existing_habits?.length ? `Already does: ${profile.existing_habits.join(", ")}` : null,
    `Right now it is ${format(now, "EEEE")}, ${now.getHours()}:00`,
    `Their buckets: ${buckets}`,
  ].filter(Boolean).join("\n- ");

  // What they read feeds back into what comes out of a dump: their own shelf, never a general reading list.
  const shelf = (sources || [])
    .flatMap((s) => (s.learnings || []).slice(0, 2).map((l) => `- ${s.title}: ${l.principle}`))
    .slice(0, 8);

  const libraryBlock = shelf.length
    ? `WHAT IS ON THEIR SHELF (sources they actually read or listened to):\n${shelf.join("\n")}`
    : "THEIR LIBRARY IS EMPTY. They have not added a book, podcast or video yet, so nothing can come from it.";

  return `${partnerName} is reading what this person just dropped into their private space. They are not chatting and they did not ask a question. They wrote it down to get it out of their head, and they want something back that is worth the words.

WHAT THEY DROPPED:
${text ? `"${text}"` : "(no words, just a photo)"}
${hasPhoto ? "They also attached a photo. Only use what you genuinely see in it to understand the situation. Never describe the photo back to them." : ""}

WHAT YOU KNOW ABOUT THEM:
- ${context}

${libraryBlock}

REPLY IN THREE PARTS.

0. title — 2 to 5 words naming what this dump is actually about, the way they would label it later when scrolling back through a wall of notes. It goes on the front of the card, so it has to stand alone. No punctuation at the end, no quotes, no "note about", never a full sentence. "Sunday dread about Monday" yes. "The money conversation with my sister" yes. "Feeling stressed" no, too plain. If it is a photo with no words, name the moment instead.

1. reflection — ONE or TWO sentences, 45 words maximum. Name what is actually underneath what they wrote, in plain words, the way someone who knows them would say it out loud across a table. No questions. No advice in this part. No therapy-speak ("it sounds like you're feeling"), no restating what they wrote, no "I hear you", no "that's valid". No em dashes, no semicolons, no "consider", no "it's worth noting", no lists, no headers, no bold.
   - If it is heavy — grief, shame, a fight, a rejection, a day that fell apart — name it gently and do not rush to fix it.
   - If it is light, funny or excited, match that instead of getting solemn.
   - If it is a photo with no words, say the one thing the picture actually gives away and nothing more.
   - If one of the principles on their shelf genuinely speaks to this, let it shape the reflection and set library_source to that source's exact title as written above. Never force it: most notes need nothing from the shelf, and an empty string is the normal answer. Never name a book, podcast or video they have not added.

2. action — the single smallest useful move, doable today or tomorrow, under 25 minutes, that pours into one of their real buckets. A title they would recognise on their grid (5 words max). A description of one line that says exactly when or how, specific enough to do without thinking. Minutes as a number. A category. The life_area bucket it belongs to.
   - Never "drink water", "journal about it", "practice self care", "take a deep breath", "reflect on this", "set a boundary".
   - If they are drained, make it the smallest useful version: one message to one person, ten minutes outside, closing the laptop, one page of the book already on their shelf.
   - If it is about a person, the move usually involves that person, not a productivity task.
   - If it is about work, the move is one real deliverable or one conversation, not a system.
   - It has to fit the hour and the energy they actually have, not a fantasy schedule.

Return only the JSON.`;
}