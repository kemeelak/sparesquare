// Writing the thing the note was really about: the email or message they have been
// circling. Same voice as the partner, in their words, ready to send as it stands.
export const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
  },
  required: ["subject", "body"],
};

export function buildDraftPrompt({ entry, kind }) {
  const isEmail = kind === "email";
  const what = entry.action_description ? `${entry.action_title} — ${entry.action_description}` : entry.action_title;

  return `Someone wrote this out to get it out of their head:

"""
${entry.text || ""}
"""

The move that came back to them: ${what}

Write the ${isEmail ? "email" : "message"} they have been meaning to send, as the actual words they would send. It is theirs to edit, so the draft has to stand on its own.

- Four to eight short sentences. Plain, warm, like a real person typing. No corporate tone, no template feel.
- Say the real thing directly: the apology, the ask, the follow up, the hello they keep putting off. Do not soften it into vagueness.
- Never use "I hope this email finds you well", "just circling back", "per my last email", bullet points, or square-bracket placeholders.
- No signature block. End on the last real sentence.
- If the note does not say who it is for, write it so it works for whoever they have in mind.
${isEmail ? "- Give a short specific subject line, under eight words, never starting with 'Re:' or 'Following up'." : "- Leave subject as an empty string."}

Return only the JSON.`;
}