import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import DumpEntryCard from "./DumpEntryCard";
import DumpComposer from "./DumpComposer";
import { Mic } from "lucide-react";
import { invokeAI } from "@/lib/plans";
import { buildDumpPrompt, DUMP_SCHEMA } from "./dumpPrompt";

export default function DumpMode({ currentUser, profile, partnerName }) {
  const [working, setWorking] = useState([]);
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
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-6" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-2xl mx-auto">
          {empty ? (
            <div className="py-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F5EDE4] flex items-center justify-center mx-auto mb-4">
                <Mic className="w-7 h-7 text-[#D4A574]" />
              </div>
              <h2 className="text-lg font-semibold text-[#1A1A1A] mb-1.5">Say it out loud</h2>
              <p className="text-sm text-[#8A8580] max-w-sm mx-auto leading-relaxed">
                Press the mic below and talk. Out loud, unfiltered, half-formed, all of it.
                {" "}{partnerName} writes it down, reads it, and hands back one small move.
              </p>
              <p className="text-xs text-[#B0AAA4] mt-3">Typing and photos work too.</p>
            </div>
          ) : (
            <>
              {working.map((entry) => (
                <DumpEntryCard key={entry.id} entry={entry} reflecting />
              ))}
              {entries.map((entry) => (
                <DumpEntryCard key={entry.id} entry={entry} />
              ))}
            </>
          )}
        </div>
      </div>

      <DumpComposer onDrop={handleDrop} busy={working.length > 0} />
    </div>
  );
}