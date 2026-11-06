import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Sparkles } from "lucide-react";
import DumpEntryCard from "./DumpEntryCard";
import DumpComposer from "./DumpComposer";
import DumpSuggestions from "./DumpSuggestions";
import { invokeAI } from "@/lib/plans";
import { buildDumpPrompt, DUMP_SCHEMA } from "./dumpPrompt";
import { WALL_CSS } from "./wallCss";

export default function DumpMode({ currentUser, profile, partnerName }) {
  const [working, setWorking] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const queryClient = useQueryClient();

  const { data: entries } = useQuery({
    queryKey: ["dumpEntries", currentUser?.id],
    queryFn: () => base44.entities.DumpEntry
      .filter({ created_by_id: currentUser.id }, "-created_date", 40)
      .then((page) => page?.items ?? page ?? []),
    initialData: [],
    enabled: !!currentUser,
  });

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
        prompt: buildDumpPrompt({ partnerName, profile, text, hasPhoto: !!photo_url }),
        response_json_schema: DUMP_SCHEMA,
        ...(photoLink ? { file_urls: [photoLink] } : {}),
      });

      if (res) {
        const action = res.action || {};
        await base44.entities.DumpEntry.update(entry.id, {
          reflection: res.reflection || "",
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

  const empty = entries.length === 0 && working.length === 0;

  return (
    <div className="tw-wall relative flex h-full min-h-0 flex-col justify-between overflow-hidden px-3 pt-3 pb-3 sm:px-6 sm:pt-6 sm:pb-4 md:px-[58px] md:pt-[42px] md:pb-[30px]">
      <style>{WALL_CSS}</style>

      {empty ? (
        <>
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
                {" "}{partnerName} writes it down, reads it, and hands back one small move.
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

          <div className="tw-center">
            <div className="tw-seal" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" />
              </svg>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <div className="tw-pairs">
            <AnimatePresence initial={false}>
              {working.map((entry) => (
                <DumpEntryCard key={entry.id} entry={entry} reflecting />
              ))}
              {entries.map((entry) => (
                <DumpEntryCard key={entry.id} entry={entry} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      <div className="flex-shrink-0">
        <DumpComposer onDrop={handleDrop} busy={working.length > 0} />
      </div>

      <div className="tw-dock" aria-hidden="true">
        <i /><i /><i />
      </div>

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