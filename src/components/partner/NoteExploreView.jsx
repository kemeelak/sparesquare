import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ArrowRight, Bookmark, CalendarPlus, Check, Handshake, Loader2, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invokeAI } from "@/lib/plans";
import ScheduleSheet from "@/components/backlog/ScheduleSheet";
import ExploreThread from "./ExploreThread";
import SwipeDismiss from "./SwipeDismiss";
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
export default function NoteExploreView({ subject, context, partnerName, backLabel, onBack, entryId }) {
  const [knowledge, setKnowledge] = useState(null);
  const [laps, setLaps] = useState([]);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);
  const endRef = useRef(null);
  const who = partnerName || "your partner";
  const [moves, setMoves] = useState({}); // lap id -> saving | done | scheduled
  const [scheduling, setScheduling] = useState(null); // the move being scheduled
  const [savedId, setSavedId] = useState(null);
  const [bookmarks, setBookmarks] = useState([]); // points they kept
  const [dropped, setDropped] = useState([]); // directions they swiped away as not it
  const queryClient = useQueryClient();

  // The same grid data the schedule picker uses on the backlog screen.
  const { data: habits } = useQuery({
    queryKey: ["habits"],
    queryFn: () => base44.entities.HabitBlock.filter({}, "-created_date", 200).then((page) => page?.items ?? page ?? []),
    initialData: [],
  });
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => base44.entities.UserProfile.filter({}, "-created_date", 1).then((page) => (page?.items ?? page ?? [])[0] || null),
  });

  const saveMove = async (move, extra) => {
    setMoves((prev) => ({ ...prev, [move.id]: "saving" }));
    await base44.entities.HabitBlock.create({
      title: move.title,
      description: move.description || "",
      duration_minutes: move.minutes || 20,
      source: "From going deeper",
      ...extra,
    });
    queryClient.invalidateQueries({ queryKey: ["habits"] });
    return null;
  };

  // Straight onto the grid, already counted — no backlog stop.
  const logNow = async (move) => {
    await saveMove(move, {
      status: "completed",
      scheduled_date: format(new Date(), "yyyy-MM-dd"),
      scheduled_hour: new Date().getHours(),
    });
    setMoves((prev) => ({ ...prev, [move.id]: "done" }));
  };

  // Not a task they can tick off: it waits in the backlog with their partner on it,
  // so the next conversation is where they get held to it.
  const holdMove = async (move) => {
    await saveMove(move, { status: "backlog", source: "Holding you accountable" });
    setMoves((prev) => ({ ...prev, [move.id]: "held" }));
  };

  const scheduleMove = async (hour, date) => {
    const move = scheduling;
    setScheduling(null);
    await saveMove(move, {
      status: "confirmed",
      scheduled_date: format(date, "yyyy-MM-dd"),
      scheduled_hour: hour,
    });
    setMoves((prev) => ({ ...prev, [move.id]: "scheduled" }));
  };

  // Everything they dig up here is kept, so walking out and back in reads the same.
  const persist = async (patch = {}) => {
    const payload = {
      entry_id: entryId || "",
      subject: subject || "",
      context: context || "",
      laps: patch.laps ?? laps,
      thread: patch.thread ?? thread,
      bookmarks: patch.bookmarks ?? bookmarks,
      dropped: patch.dropped ?? dropped,
    };
    try {
      if (savedId) {
        await base44.entities.NoteExploration.update(savedId, payload);
        return;
      }
      const created = await base44.entities.NoteExploration.create(payload);
      setSavedId(created.id);
    } catch (error) {
      // Reading it right now still works; it just won't be here next time.
    }
  };

  // Swiping a layer away is them saying "not what I'm looking for" — so it goes,
  // the partner is told never to come back with it, and a fresh angle comes in its place.
  const rejectLap = (id) => {
    const lap = laps.find((item) => item.id === id);
    if (!lap) return;
    const next = laps.filter((item) => item.id !== id);
    const nextDropped = [
      ...dropped,
      {
        read: lap.read || "",
        threads: (lap.threads || []).map((t) => t.label).filter(Boolean),
        question: lap.question || "",
      },
    ];
    const nextBookmarks = bookmarks.filter((b) => b.lap_id !== id);
    setLaps(next);
    setDropped(nextDropped);
    setBookmarks(nextBookmarks);
    setMoves({});
    persist({ laps: next, dropped: nextDropped, bookmarks: nextBookmarks });
    if (!busy) run(next, nextDropped);
  };

  // Keeping a point is a bookmark on the idea itself, not on the layer around it.
  const bookmarkKey = (lap, kind, index) => `${lap.id}:${kind}:${index}`;

  const keepPoint = (lap, kind, index, label, detail) => {
    const key = bookmarkKey(lap, kind, index);
    const already = bookmarks.some((b) => b.key === key);
    const next = already
      ? bookmarks.filter((b) => b.key !== key)
      : [
          ...bookmarks,
          { key, lap_id: lap.id, kind, label: label || "", detail: detail || "", at: new Date().toISOString() },
        ];
    setBookmarks(next);
    persist({ bookmarks: next });
  };

  const isKept = (lap, kind, index) => bookmarks.some((b) => b.key === bookmarkKey(lap, kind, index));

  const letGo = (point) => {
    const next = bookmarks.filter((b) => b.key !== point.key);
    setBookmarks(next);
    persist({ bookmarks: next });
  };

  const run = async (earlier, avoid) => {
    const skip = avoid ?? dropped;
    setBusy(true);
    setFailed(false);
    try {
      const kb = knowledge || (await loadKnowledge());
      if (!knowledge) setKnowledge(kb);
      const res = await invokeAI("note_explore", {
        prompt: buildExplorePrompt({ partnerName: who, subject, context, ...kb, laps: earlier, dropped: skip }),
        response_json_schema: EXPLORE_SCHEMA,
        // So a source they have read can be looked up, not just quoted from memory.
        add_context_from_internet: true,
        model: "gemini_3_flash",
      });
      if (!res?.read) {
        setFailed(true);
        return;
      }
      const next = [...earlier, { ...res, id: res.id || `lap_${Date.now()}` }];
      setLaps(next);
      persist({ laps: next, dropped: skip });
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 80);
    } catch (error) {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  // Pick up where they left off, or open it for the first time.
  useEffect(() => {
    let alive = true;
    (async () => {
      const page = await base44.entities.NoteExploration.filter(
        { entry_id: entryId || "", subject: subject || "" },
        "-created_date",
        1
      );
      const found = (page?.items ?? page ?? [])[0];
      if (!alive) return;
      if (found?.id) setSavedId(found.id);
      setBookmarks(found?.bookmarks || []);
      setDropped(found?.dropped || []);
      const kept = (found?.laps || []).map((lap, i) => ({ ...lap, id: lap.id || `lap_kept_${i}` }));
      if (kept.length) {
        setLaps(kept);
        setThread(found.thread || []);
        setBusy(false);
        return;
      }
      run([]);
    })().catch(() => {
      if (alive) run([]);
    });
    return () => {
      alive = false;
    };
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
        add_context_from_internet: true,
        model: "gemini_3_flash",
      });
      const nextThread = [
        ...thread,
        { q: question, a: typeof answer === "string" && answer.trim() ? answer.trim() : "That one didn't come through. Ask me again." },
      ];
      setThread(nextThread);
      persist({ thread: nextThread });
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
            <button
              type="button"
              className="tw-icon-btn"
              onClick={() => {
                setDropped([]);
                run([], []);
              }}
              aria-label="Start it over"
            >
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

          {laps.length > 0 && (
            <p className="tw-swipe-note">Swipe a layer left if it isn't it — keep the points worth holding on to</p>
          )}

          {laps.map((lap, index) => (
            <SwipeDismiss key={lap.id} onDismiss={() => rejectLap(lap.id)}>
            <section className="tw-lap">
              {index > 0 && <p className="tw-stamp">Lap {index + 1}</p>}

              <div className="tw-block">
                <div className="tw-block-head">
                  <p className="tw-stamp">What {who} sees</p>
                  <button
                    type="button"
                    className={`tw-keep ${isKept(lap, "read", 0) ? "is-kept" : ""}`}
                    onClick={() => keepPoint(lap, "read", 0, "What came back", lap.read)}
                    aria-pressed={isKept(lap, "read", 0)}
                    aria-label={isKept(lap, "read", 0) ? "Let this point go" : "Keep this point"}
                  >
                    <Bookmark className="w-3.5 h-3.5" fill={isKept(lap, "read", 0) ? "currentColor" : "none"} />
                  </button>
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
                      <ExploreThread
                        key={i}
                        label={item.label}
                        detail={item.detail}
                        kept={isKept(lap, "thread", i)}
                        onKeep={() => keepPoint(lap, "thread", i, item.label, item.detail)}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {lap.question && (
                <div className="tw-block">
                  <div className="tw-block-head">
                    <p className="tw-stamp">Worth sitting with</p>
                    <button
                      type="button"
                      className={`tw-keep ${isKept(lap, "question", 0) ? "is-kept" : ""}`}
                      onClick={() => keepPoint(lap, "question", 0, "Worth sitting with", lap.question)}
                      aria-pressed={isKept(lap, "question", 0)}
                      aria-label={isKept(lap, "question", 0) ? "Let this question go" : "Keep this question"}
                    >
                      <Bookmark className="w-3.5 h-3.5" fill={isKept(lap, "question", 0) ? "currentColor" : "none"} />
                    </button>
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
                  {lap.move.minutes && lap.move.kind !== "behaviour" ? <p className="tw-action-meta">{lap.move.minutes} min</p> : null}

                  <div className="tw-move-acts">
                    {moves[lap.id] === "done" ? (
                      <span className="tw-move-done"><Check /> Done — logged on your grid</span>
                    ) : moves[lap.id] === "scheduled" ? (
                      <span className="tw-move-done"><Check /> Scheduled on your grid</span>
                    ) : moves[lap.id] === "held" ? (
                      <span className="tw-move-done"><Check /> Held — {who} keeps this one on you</span>
                    ) : lap.move.kind === "behaviour" ? (
                      <button
                        type="button"
                        className="tw-mini"
                        disabled={moves[lap.id] === "saving"}
                        onClick={() => holdMove({ ...lap.move, id: lap.id })}
                      >
                        <Handshake /> Hold me accountable
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="tw-mini"
                          disabled={moves[lap.id] === "saving"}
                          onClick={() => logNow({ ...lap.move, id: lap.id })}
                        >
                          <Check /> Did it now
                        </button>
                        <button
                          type="button"
                          className="tw-mini"
                          disabled={moves[lap.id] === "saving"}
                          onClick={() => setScheduling({ ...lap.move, id: lap.id })}
                        >
                          <CalendarPlus /> Schedule
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="tw-lap-foot">
                <button type="button" className="tw-notit" onClick={() => rejectLap(lap.id)}>
                  <X className="w-3.5 h-3.5" />
                  Not this one
                </button>
              </div>
            </section>
            </SwipeDismiss>
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

          {bookmarks.length > 0 && (
            <div className="tw-block tw-kept-points">
              <div className="tw-block-head">
                <p className="tw-stamp">Kept</p>
              </div>
              <ul className="tw-kept-list">
                {bookmarks.map((point) => (
                  <li key={point.key} className="tw-kept-item">
                    <div className="tw-kept-body">
                      <p className="tw-kept-label">{point.label || "A point"}</p>
                      {point.detail && <p className="tw-kept-detail">{point.detail}</p>}
                    </div>
                    <button
                      type="button"
                      className="tw-icon-btn"
                      onClick={() => letGo(point)}
                      aria-label="Let this point go"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
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

      {scheduling && (
        <ScheduleSheet
          habit={{ ...scheduling, duration_minutes: scheduling.minutes || 20 }}
          habits={habits}
          profile={profile}
          showRepeat={false}
          onClose={() => setScheduling(null)}
          onSchedule={scheduleMove}
        />
      )}
    </div>
  );
}