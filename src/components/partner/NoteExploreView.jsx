import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Loader2, RefreshCw, Send } from "lucide-react";
import { invokeAI } from "@/lib/plans";
import { buildExplorePrompt, buildExploreFollowUp, EXPLORE_SCHEMA } from "./explorePrompt";

// What the partner already knows of them: everything they have dumped, and what is on the shelf.
async function loadKnowledge() {
  const [dumpPage, sourcePage] = await Promise.all([
    base44.entities.DumpEntry.filter({}, "-created_date", 25),
    base44.entities.PluginSource.filter({}, "-created_date", 12),
  ]);
  return {
    dumps: dumpPage?.items ?? dumpPage ?? [],
    sources: sourcePage?.items ?? sourcePage ?? [],
  };
}

// One line of a note, read back through their whole wall and their library,
// with room to keep pulling on it.
export default function NoteExploreView({ note, parent, partnerName, onBack }) {
  const [knowledge, setKnowledge] = useState(null);
  const [reading, setReading] = useState(null);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);
  const endRef = useRef(null);
  const who = partnerName || "your partner";

  const explore = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const kb = knowledge || (await loadKnowledge());
      if (!knowledge) setKnowledge(kb);
      const res = await invokeAI("note_explore", {
        prompt: buildExplorePrompt({ partnerName: who, note, parent, ...kb }),
        response_json_schema: EXPLORE_SCHEMA,
      });
      if (!res?.read) {
        setFailed(true);
        return;
      }
      setReading(res);
    } catch (error) {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    explore();
  }, []);

  const ask = async () => {
    const question = draft.trim();
    if (!question || asking) return;
    setAsking(true);
    setDraft("");
    try {
      const answer = await invokeAI("note_explore", {
        prompt: buildExploreFollowUp({
          partnerName: who,
          note,
          parent,
          ...(knowledge || { dumps: [], sources: [] }),
          reading,
          thread,
          question,
        }),
      });
      setThread((prev) => [
        ...prev,
        { q: question, a: typeof answer === "string" && answer.trim() ? answer.trim() : "That one didn't come through. Ask me again." },
      ]);
    } finally {
      setAsking(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 60);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="tw-head">
        <button type="button" className="tw-back" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5" />
          The note
        </button>
        <span className="tw-head-stamp">Going deeper</span>
        {reading && (
          <div className="tw-head-tools">
            <button type="button" className="tw-icon-btn" onClick={explore} aria-label="Read it again">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="tw-scroll tw-detail-scroll">
        <div className="tw-detail-inner">
          <p className="tw-stamp">The line you picked</p>
          <blockquote className="tw-explore-line">
            {note?.text || (note?.voice_uri ? "A recording you added." : "A photo you added.")}
          </blockquote>

          {busy ? (
            <p className="tw-explore-loading">
              <Loader2 className="w-4 h-4 animate-spin" />
              Going back through everything you've written…
            </p>
          ) : failed ? (
            <div className="tw-foot" style={{ marginTop: 0 }}>
              <span className="tw-small" style={{ margin: 0, flex: 1 }}>That didn't come through just now.</span>
              <button type="button" className="tw-later" onClick={explore}>Try again</button>
            </div>
          ) : (
            <>
              <section className="tw-block">
                <div className="tw-block-head">
                  <p className="tw-stamp">What {who} sees</p>
                </div>
                <p className="tw-scribble">{reading.read}</p>
              </section>

              {reading.threads?.length > 0 && (
                <section className="tw-block">
                  <div className="tw-block-head">
                    <p className="tw-stamp">Threads back through your own material</p>
                  </div>
                  <ul className="tw-threads">
                    {reading.threads.map((item, index) => (
                      <li key={index} className="tw-thread">
                        <p className="tw-thread-label">{item.label}</p>
                        <p className="tw-thread-detail">{item.detail}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {reading.question && (
                <section className="tw-block">
                  <div className="tw-block-head">
                    <p className="tw-stamp">Worth sitting with</p>
                  </div>
                  <p className="tw-ask-q-line">{reading.question}</p>
                </section>
              )}

              {reading.move?.title && (
                <section className="tw-block">
                  <div className="tw-block-head">
                    <p className="tw-stamp">Where it could go</p>
                  </div>
                  <p className="tw-action-title" style={{ marginTop: 0 }}>{reading.move.title}</p>
                  <p className="tw-action-copy">{reading.move.description}</p>
                  {reading.move.minutes ? (
                    <p className="tw-action-meta">{reading.move.minutes} min</p>
                  ) : null}
                </section>
              )}

              {thread.map((turn, index) => (
                <div key={index} className="tw-ask">
                  <p className="tw-ask-you">{turn.q}</p>
                  <p className="tw-ask-back">{turn.a}</p>
                </div>
              ))}

              {asking && (
                <p className="tw-explore-loading">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Reading…
                </p>
              )}
              <div ref={endRef} />
            </>
          )}
        </div>
      </div>

      <div className="tw-bar">
        <div className="tw-composer">
          <div className="tw-compose-row">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
              rows={1}
              placeholder="Keep pulling on it…"
              aria-label="Ask about this line"
              className="tw-textarea tw-ask-input"
              disabled={busy || failed}
            />
            <button
              type="button"
              className="tw-send"
              onClick={ask}
              disabled={!draft.trim() || asking || busy || failed}
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}