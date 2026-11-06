import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { invokeAI } from "@/lib/plans";
import { buildSuggestPrompt, SUGGEST_SCHEMA } from "./suggestPrompt";
import SuggestionCard from "./SuggestionCard";

// A few things worth trying, pulled from what the wall already knows about them.
// Rendered into the page body so it always opens on top, whatever the wall is doing.
export default function DumpSuggestions({ profile, partnerName, onClose }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [added, setAdded] = useState({});
  const [pending, setPending] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let alive = true;
    setItems(null);
    setError("");
    invokeAI("dump_suggest", {
      prompt: buildSuggestPrompt({ partnerName, profile }),
      response_json_schema: SUGGEST_SCHEMA,
    })
      .then((res) => {
        if (!alive) return;
        const list = (res?.suggestions || []).slice(0, 4);
        setItems(list);
        if (!list.length) setError("Nothing came up just now.");
      })
      .catch(() => {
        if (!alive) return;
        setItems([]);
        setError("I couldn't pull anything up just now.");
      });
    return () => { alive = false; };
  }, [attempt]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  return createPortal(
    <div className="tw-sheet-backdrop" onClick={onClose}>
      <motion.div
        className="tw-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Ideas for your backlog"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.24, ease: [0.2, 0.8, 0.25, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tw-sheet-grip" aria-hidden="true" />

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
          <>
            <p className="tw-sheet-loading">
              <Loader2 className="w-4 h-4 animate-spin" /> Reading your week…
            </p>
            <div className="tw-suggests">
              {[0, 1, 2, 3].map((i) => <div key={i} className="tw-suggest-skel" />)}
            </div>
          </>
        ) : items.length === 0 ? (
          <div className="tw-sheet-empty">
            <p className="tw-small">{error}</p>
            <button onClick={() => setAttempt((a) => a + 1)} className="tw-later">Try again</button>
          </div>
        ) : (
          <div className="tw-suggests">
            {items.map((item, index) => (
              <SuggestionCard
                key={`${item.title}-${index}`}
                item={item}
                savedId={added[index]}
                pending={pending === index}
                onAdd={() => add(item, index)}
              />
            ))}
          </div>
        )}

        <p className="tw-sheet-foot">Built from your goals and the way your week is shaped. Nothing is saved until you add it.</p>
      </motion.div>
    </div>,
    document.body
  );
}