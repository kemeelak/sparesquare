import React from "react";
import { Link } from "react-router-dom";
import { Check, Clock, Loader2, Plus } from "lucide-react";
import { areaMeta, CATEGORY_EMOJI } from "@/lib/lifeAreas";

// One suggested move: what it is, how long, which bucket, and the two things you can do with it —
// do it now, or park it in the backlog.
export default function SuggestionCard({ item, savedId, doneId, pending, onAdd, onDone }) {
  const area = areaMeta(item.life_area);

  return (
    <div className="tw-suggest">
      <p className="tw-suggest-title">{item.title}</p>
      <p className="tw-suggest-copy">{item.description}</p>
      <p className="tw-action-meta">
        <span className="tw-meta-bit"><Clock className="w-3 h-3" />{item.minutes || 15}min</span>
        <span>· {area.emoji} {area.short}</span>
        <span>{CATEGORY_EMOJI[item.category] || "⚡"}</span>
      </p>

      {doneId ? (
        <Link to="/" className="tw-moved-link tw-suggest-saved">
          <Check className="w-3 h-3" /> Done just now
        </Link>
      ) : savedId ? (
        <Link
          to={`/Backlog?highlight=${typeof savedId === "string" ? savedId : ""}`}
          className="tw-moved-link tw-suggest-saved"
        >
          <Check className="w-3 h-3" /> In your backlog
        </Link>
      ) : (
        <div className="tw-suggest-acts">
          <button onClick={onDone} disabled={pending} className="tw-do tw-do-done">
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            I did it now
          </button>
          <button onClick={onAdd} disabled={pending} className="tw-later">
            <Plus className="w-3.5 h-3.5" />
            Add to backlog
          </button>
        </div>
      )}
    </div>
  );
}