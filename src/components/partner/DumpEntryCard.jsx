import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import DumpActionCard from "./DumpActionCard";

export default function DumpEntryCard({ entry, reflecting }) {
  const [photo, setPhoto] = useState(null);

  // Photos sit in private storage, so each one is opened with a short-lived link.
  useEffect(() => {
    let alive = true;
    if (!entry.photo_url) return undefined;
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: entry.photo_url, expires_in: 3600 })
      .then((res) => { if (alive) setPhoto(res?.signed_url || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [entry.photo_url]);

  const stamp = entry.created_date
    ? format(new Date(entry.created_date), "EEE d MMM · h:mm a")
    : "just now";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
      <p className="text-[11px] text-[#B0AAA4] mb-1.5">{stamp}</p>

      <div className="bg-white border border-[#E8E4DF] rounded-2xl rounded-tl-md px-4 py-3">
        {entry.text && (
          <p className="text-sm text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">{entry.text}</p>
        )}
        {photo && (
          <img
            src={photo}
            alt="What you dropped in"
            className={`w-full max-h-72 object-cover rounded-xl ${entry.text ? "mt-2.5" : ""}`}
          />
        )}
      </div>

      {reflecting ? (
        <p className="mt-2 text-xs text-[#B0AAA4] animate-pulse pl-1">Reading it…</p>
      ) : entry.reflection ? (
        <>
          <div className="mt-2 flex items-start gap-2 pl-1">
            <div className="w-5 h-5 rounded-md bg-[#1A1A1A] flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-[8px] font-bold">S²</span>
            </div>
            <p className="text-sm text-[#4A5568] leading-relaxed">{entry.reflection}</p>
          </div>
          <DumpActionCard entry={entry} />
        </>
      ) : (
        <p className="mt-2 text-xs text-[#B0AAA4] pl-1">Nothing came back on this one.</p>
      )}
    </motion.div>
  );
}