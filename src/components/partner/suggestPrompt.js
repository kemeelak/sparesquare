import { format } from "date-fns";
import { bucketSettings } from "@/lib/lifeAreas";

// A handful of real things they could put on their wall today, each small enough
// to actually do. Same shape as a dump's action, so it drops into the backlog the same way.
export const SUGGEST_SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
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
  },
  required: ["suggestions"],
};

export function buildSuggestPrompt({ partnerName, profile }) {
  const now = new Date();
  const buckets = bucketSettings(profile)
    .filter((b) => !b.hidden)
    .map((b) => `${b.key} ("${b.label}")`)
    .join(", ");

  const context = [
    profile?.growth_focuses?.length ? `Working on: ${profile.growth_focuses.join(", ")}` : null,
    profile?.goals?.length ? `Goals: ${profile.goals.join(", ")}` : null,
    profile?.challenges?.length ? `Has struggled with: ${profile.challenges.join(", ")}` : null,
    profile?.energy_pattern ? `Energy: ${profile.energy_pattern}` : null,
    profile?.existing_habits?.length ? `Already does, never suggest these back: ${profile.existing_habits.join(", ")}` : null,
    profile?.commute?.enabled ? "Commutes, so a ride is usable time" : null,
    `Right now it is ${format(now, "EEEE")}, ${now.getHours()}:00`,
    `Their buckets: ${buckets}`,
  ].filter(Boolean).join("\n- ");

  return `${partnerName} is offering this person four things they could actually put on their wall today. They have not said anything yet. They are standing in front of an empty page and need something real to reach for.

WHAT YOU KNOW ABOUT THEM:
- ${context}

Give FOUR suggestions. Each one is a single small move, doable today or tomorrow, between 10 and 25 minutes.
- A title they would recognise at a glance on their grid, 5 words maximum.
- One line of description that says exactly when or how, specific enough to do without thinking about it.
- Minutes as a number, a category, and the life_area bucket it pours into.
- Spread them across different buckets. Do not give four work tasks or four workouts.
- Tie them to what they are actually working on. Skip anything they already do.
- Never: "drink water", "journal about it", "practice self care", "take a deep breath", "reflect", "set a boundary", "make a plan", "review your goals".
- Bad: "Read more". Good: "Ten pages of the book on your nightstand before the light goes off."
- Bad: "Reconnect with a friend". Good: "Text Sam one line asking how the new job is going."
- Bad: "Get organised". Good: "Clear the one pile on the desk you keep walking past."

Return only the JSON.`;
}