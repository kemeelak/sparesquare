import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bookmark, Plus, Sparkles } from "lucide-react";
import DumpNoteFront from "./DumpNoteFront";
import DumpNoteDetail from "./DumpNoteDetail";
import DumpComposer from "./DumpComposer";
import DumpSuggestions from "./DumpSuggestions";
import { invokeAI } from "@/lib/plans";
import { buildDumpPrompt, DUMP_SCHEMA } from "./dumpPrompt";
import { WALL_CSS } from "./wallCss";

export default function DumpMode({ currentUser, profile, partnerName }) {
  const [working, setWorking] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [openId, setOpenId] = useState(null);
  const queryClient = useQueryClient();

  const { data: entries } = useQuery({
    queryKey: ["dumpEntries", currentUser?.id],
    queryFn: () => base44.entities.DumpEntry
      .filter({ created_by_id: currentUser.id }, "-created_date", 40)
      .then((page) => page?.items ?? page ?? []),
    initialData: [],
    enabled: !!currentUser,
  });

  const { data: sources } = useQuery({
    queryKey: ["dumpLibrary", currentUser?.id],
    queryFn: () => base44.entities.PluginSource
      .filter({ created_by_id: currentUser.id }, "-created_date", 12)
      .then((page) => page?.items ?? page ?? []),
    initialData: [],
    enabled: !!currentUser,
  });

  // Points kept while digging belong to a note, so the wall can show how many it holds.
  const { data: explorations } = useQuery({
    queryKey: ["keptPoints", currentUser?.id],
    queryFn: () => base44.entities.NoteExploration
      .filter({ created_by_id: currentUser.id }, "-created_date", 200)
      .then((page) => page?.items ?? page ?? []),
    initialData: [],
    enabled: !!currentUser,
  });

  const keptCount = (id) =>
    explorations.reduce(
      (total, row) => total + (row.entry_id === id ? row.bookmarks?.length || 0 : 0),
      0
    );
  const keptTotal = explorations.reduce((total, row) => total + (row.bookmarks?.length || 0), 0);

  const handleDrop = async ({ text, file }) => {
    let photo_url = null;
    let photoLink = null;

    if (file) {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      photo_url = file_uri;
      const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });
      photoLink = signed?.signed_url || null;
    }

    const entry = await base44.entities.DumpEntry.create({ text, photo_url });
    setWorking((prev) => [{ ...entry, text, photo_url }, ...prev]);

    try {
      const res = await invokeAI("coach", {
        prompt: buildDumpPrompt({ partnerName, profile, text, hasPhoto: !!photo_url, sources }),
        response_json_schema: DUMP_SCHEMA,
        ...(photoLink ? { file_urls: [photoLink] } : {}),
      });

      if (res) {
        const action = res.action || {};
        await base44.entities.DumpEntry.update(entry.id, {
          title: res.title || "",
          reflection: res.reflection || "",
          library_source: res.library_source || "",
          action_title: action.title || "",
          action_description: action.description || "",
          action_minutes: action.minutes || null,
          action_category: action.category || "",
          action_life_area: action.life_area || "",
          action_status: "suggested",
        });
      }
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["dumpEntries"] });
      setWorking((prev) => prev.filter((e) => e.id !== entry.id));
    }
  };

  const all = [...working, ...entries];
  const open = openId ? all.find((entry) => entry.id === openId) : null;
  const empty = all.length === 0;

  // One scroll column, one docked composer. Nothing floats, nothing overlaps,
  // so the bar never moves while the wall scrolls.
  return (
    <div className="tw-wall relative flex h-full min-h-0 flex-col overflow-hidden">
      <style>{WALL_CSS}</style>

      {open ? (
        <DumpNoteDetail
          key={open.id}
          entry={open}
          partnerName={partnerName}
          reflecting={working.some((entry) => entry.id === open.id)}
          onBack={() => setOpenId(null)}
        />
      ) : (
        <>
          {!empty && (
            <div className="flex flex-none items-center justify-between gap-3 px-4 pb-1 pt-3 sm:px-6">
              <p className="tw-stamp" style={{ margin: 0 }}>Your wall</p>
              <Link
                to="/KeptHub"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E4DF] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#1A1A1A] transition-colors hover:bg-[#F5F0EB]"
              >
                <Bookmark className="w-3.5 h-3.5 text-[#D4A574]" fill="currentColor" />
                Kept · {keptTotal}
              </Link>
            </div>
          )}

          <div className="tw-scroll flex-1 min-h-0 overflow-y-auto">
            {empty ? (
              <div className="tw-empty">
                <div className="tw-top">
                  <article
                    className="tw-note tw-note-btn"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSuggesting(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSuggesting(true);
                      }
                    }}
                  >
                    <span className="tw-pin" aria-hidden="true" />
                    <h2 className="tw-h2">Say it out loud</h2>
                    <p className="tw-copy">
                      Press the mic below and talk. Out loud, unfiltered, half-formed, all of it.
                      {" "}{partnerName} gives it a title, reads it, and hands back one small move.
                    </p>
                    <p className="tw-small">Typing and photos work too.</p>
                    <p className="tw-note-cta">
                      <Sparkles className="w-3.5 h-3.5" />
                      Tap to see {partnerName}'s ideas
                    </p>
                  </article>

                  <article className="tw-note tw-note-quiet">
                    <span className="tw-pin tw-pin-alt" aria-hidden="true" />
                    <p className="tw-scribble">Hit the mic and just talk. Easier than finding the words to type.</p>
                  </article>
                </div>

                <p className="tw-empty-line">
                  Nothing pinned yet. Everything you drop gets a note of its own, and you can open it later to go deeper.
                </p>
              </div>
            ) : (
              <div className="tw-wall-grid">
                <AnimatePresence initial={false}>
                  {all.map((entry) => (
                    <DumpNoteFront
                      key={entry.id}
                      entry={entry}
                      reflecting={working.some((item) => item.id === entry.id)}
                      keptCount={keptCount(entry.id)}
                      onOpen={() => setOpenId(entry.id)}
                    />
                  ))}
                </AnimatePresence>

                <button type="button" className="tw-front tw-front-add" onClick={() => setSuggesting(true)}>
                  <Plus className="w-4 h-4" />
                  <span>{partnerName} has ideas</span>
                </button>
              </div>
            )}
          </div>

          <div className="tw-bar">
            <DumpComposer onDrop={handleDrop} busy={working.length > 0} />
          </div>
        </>
      )}

      <AnimatePresence>
        {suggesting && (
          <DumpSuggestions
            profile={profile}
            partnerName={partnerName}
            onClose={() => setSuggesting(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}