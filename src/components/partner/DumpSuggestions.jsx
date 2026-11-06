import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, Clock, Loader2, Plus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { invokeAI } from "@/lib/plans";
import { buildSuggestPrompt, SUGGEST_SCHEMA } from "./suggestPrompt";
import { areaMeta, CATEGORY_EMOJI } from "@/lib/lifeAreas";

// A few things worth trying, pulled from what the wall already knows about them.
export default function DumpSuggestions({ profile, partnerName, onClose }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [added, setAdded] = useState({});
  const [pending, setPending] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let alive = true;
    invokeAI("dump_suggest", {
      prompt: buildSuggestPrompt({ partnerName, profile }),
      response_json_schema: SUGGEST_SCHEMA,
    })
      .then((res) => {
        if (!alive) return;
        const list = (res?.suggestions || []).slice(0, 4);
        setItems(list);
        if (!list.length) setError("Nothing came up just now. Try again in a moment.");
      })
      .catch(() => {
        if (!alive) return;
        setItems([]);
        setError("I couldn't pull anything up just now. Try again in a moment.");
      });
    return () => { alive = false; };
  }, []);

  const add = async (item, index) => {
    setPending(index);
    const created = await base44.entities.HabitBlock.create({
      title: item.title,
      description: item.description || "",
      duration_minutes: item.minutes || 15,
      category: item.category || "general",
      life_area: item.life_area || undefined,
      source: "Suggested for you",
      status: "backlog",
    });
    queryClient.invalidateQueries({ queryKey: ["habits"] });
    setAdded((prev) => ({ ...prev, [index]: created?.id || true }));
    setPending(null);
  };

  return (
    <div className="tw-sheet-backdrop" onClick={onClose}>
      <motion.div
        className="tw-sheet"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.26, ease: [0.2, 0.8, 0.25, 1] }}
      >
        <div className="tw-sheet-head">
          <div>
            <p className="tw-stamp">From {partnerName}</p>
            <h3 className="tw-sheet-title">Pick one for your backlog</h3>
          </div>
          <button onClick={onClose} className="tw-sheet-close" aria-label="Close suggestions">
            <X className="w-4 h-4" />
          </button>
        </div>

        {items === null ? (
          <div className="tw-suggests">
            {[0, 1, 2, 3].map((i) => <div key={i} className="tw-suggest-skel" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="tw-small">{error}</p>
        ) : (
          <div className="tw-suggests">
            {items.map((item, index) => {
              const area = areaMeta(item.life_area);
              const savedId = added[index];
              return (
                <div key={`${item.title}-${index}`} className="tw-suggest">
                  <p className="tw-suggest-title">{item.title}</p>
                  <p className="tw-suggest-copy">{item.description}</p>
                  <p className="tw-action-meta">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Clock className="w-3 h-3" />{item.minutes || 15}min
                    </span>
                    <span>· {area.emoji} {area.short}</span>
                    <span>{CATEGORY_EMOJI[item.category] || "⚡"}</span>
                  </p>

                  {savedId ? (
                    <Link to={`/Backlog?highlight=${typeof savedId === "string" ? savedId : ""}`} className="tw-moved-link" style={{ marginTop: 10 }}>
                      <Check className="w-3 h-3" /> In your backlog
                    </Link>
                  ) : (
                    <div className="tw-actions" style={{ marginTop: 10 }}>
                      <button onClick={() => add(item, index)} disabled={pending === index} className="tw-later">
                        {pending === index
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Plus className="w-3.5 h-3.5" />}
                        Add to backlog
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="tw-hint" style={{ marginLeft: 0 }}>
          Built from your goals and the way your week is shaped. Nothing is saved until you add it.
        </p>
      </motion.div>
    </div>
  );
}