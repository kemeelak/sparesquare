import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ArrowRight, Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
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

// One dump (or one line of it) read back through their whole wall and their library,
// one lap at a time, with room to ask in between.
export default function NoteExploreView({ subject, context, partnerName, backLabel, onBack }) {
  const [knowledge, setKnowledge] = useState(null);
  const [laps, setLaps] = useState([]);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);
  const endRef = useRef(null);
  const who = partnerName || "your partner";

  const run = async (earlier) => {
    setBusy(true);
    setFailed(false);
    try {
      const kb = knowledge || (await loadKnowledge());
      if (!knowledge) setKnowledge(kb);
      const res = await invokeAI("note_explore", {
        prompt: buildExplorePrompt({ partnerName: who, subject, context, ...kb, laps: earlier }),
        response_json_schema: EXPLORE_SCHEMA,
      });
      if (!res?.read) {
        setFailed(true);
        return;
      }
      setLaps([...earlier, res]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 80);
    } catch (error) {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    run([]);
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
          subject,
          context,
          ...(knowledge || { dumps: [], sources: [] }),
          laps,
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
          {backLabel || "Back"}
        </button>
        <span className="tw-head-stamp">Digging in</span>
        {laps.length > 0 && (
          <div className="tw-head-tools">
            <button type="button" className="tw-icon-btn" onClick={() => run([])} aria-label="Start it over">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="tw-scroll tw-detail-scroll">
        <div className="tw-detail-inner">
          <p className="tw-stamp">What you're digging into</p>
          <blockquote className="tw-explore-line">
            {subject || "A recording or a photo you added."}
          </blockquote>

          {laps.map((lap, index) => (
            <section key={index} className="tw-lap">
              {index > 0 && <p className="tw-stamp">Lap {index + 1}</p>}

              <div className="tw-block">
                <div className="tw-block-head">
                  <p className="tw-stamp">What {who} sees</p>
                </div>
                <p className="tw-scribble">{lap.read}</p>
              </div>

              {lap.threads?.length > 0 && (
                <div className="tw-block">
                  <div className="tw-block-head">
                    <p className="tw-stamp">Threads back through your own material</p>
                  </div>
                  <ul className="tw-threads">
                    {lap.threads.map((item, i) => (
                      <li key={i} className="tw-thread">
                        <p className="tw-thread-label">{item.label}</p>
                        <p className="tw-thread-detail">{item.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {lap.question && (
                <div className="tw-block">
                  <div className="tw-block-head">
                    <p className="tw-stamp">Worth sitting with</p>
                  </div>
                  <p className="tw-ask-q-line">{lap.question}</p>
                </div>
              )}

              {lap.move?.title && (
                <div className="tw-block">
                  <div className="tw-block-head">
                    <p className="tw-stamp">Where it could go</p>
                  </div>
                  <p className="tw-action-title" style={{ marginTop: 0 }}>{lap.move.title}</p>
                  <p className="tw-action-copy">{lap.move.description}</p>
                  {lap.move.minutes ? <p className="tw-action-meta">{lap.move.minutes} min</p> : null}
                </div>
              )}
            </section>
          ))}

          {busy ? (
            <p className="tw-explore-loading">
              <Loader2 className="w-4 h-4 animate-spin" />
              {laps.length ? "Going a level further…" : "Going back through everything you've written…"}
            </p>
          ) : failed ? (
            <div className="tw-foot" style={{ marginTop: 0 }}>
              <span className="tw-small" style={{ margin: 0, flex: 1 }}>That didn't come through just now.</span>
              <button type="button" className="tw-later" onClick={() => run(laps)}>Try again</button>
            </div>
          ) : (
            <button type="button" className="tw-go-deeper" onClick={() => run(laps)}>
              <Sparkles className="w-4 h-4" />
              Keep going
              <ArrowRight className="w-4 h-4" />
            </button>
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
              placeholder="Ask something specific…"
              aria-label="Ask about this"
              className="tw-textarea tw-ask-input"
              disabled={busy}
            />
            <button
              type="button"
              className="tw-send"
              onClick={ask}
              disabled={!draft.trim() || asking || busy}
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