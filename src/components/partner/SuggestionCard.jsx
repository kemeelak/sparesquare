import React from "react";
import { Link } from "react-router-dom";
import { Check, Clock, Loader2, Plus } from "lucide-react";
import { areaMeta, CATEGORY_EMOJI } from "@/lib/lifeAreas";

// One suggested move: what it is, how long, which bucket, and the one thing you can do with it.
export default function SuggestionCard({ item, savedId, pending, onAdd }) {
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

      {savedId ? (
        <Link
          to={`/Backlog?highlight=${typeof savedId === "string" ? savedId : ""}`}
          className="tw-moved-link tw-suggest-saved"
        >
          <Check className="w-3 h-3" /> In your backlog
        </Link>
      ) : (
        <button onClick={onAdd} disabled={pending} className="tw-do tw-suggest-add">
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add to backlog
        </button>
      )}
    </div>
  );
}