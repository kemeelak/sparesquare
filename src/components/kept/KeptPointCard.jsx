import React from "react";
import { format } from "date-fns";
import { Bookmark } from "lucide-react";

// One point they held on to, with the note it came out of underneath it.
export default function KeptPointCard({ point }) {
  const when = point.when ? format(new Date(point.when), "d MMM") : "";

  return (
    <article className="flex flex-col rounded-2xl border border-[#E8E4DF] bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A6A3C]">
          {point.label || "A point"}
        </p>
        <Bookmark className="mt-0.5 h-3.5 w-3.5 flex-none text-[#D4A574]" fill="currentColor" />
      </div>

      {point.detail && <p className="mt-2 text-[15px] leading-relaxed text-[#2C2C2C]">{point.detail}</p>}

      <p className="mt-auto pt-3 text-[11px] text-[#B0AAA4]">
        From “{point.noteTitle}”{when ? ` · ${when}` : ""}
      </p>
    </article>
  );
}