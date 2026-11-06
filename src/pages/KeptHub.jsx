import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import KeptPointCard from "@/components/kept/KeptPointCard";
import { shortTitle } from "@/components/partner/DumpNoteFront";

const asList = (page) => page?.items ?? page ?? [];

// Everything they bookmarked while digging, from every note, in one place.
export default function KeptHub() {
  const currentUser = useCurrentUser();

  const { data: points, isLoading } = useQuery({
    queryKey: ["keptHub", currentUser?.id],
    queryFn: async () => {
      const [rows, entries] = await Promise.all([
        base44.entities.NoteExploration
          .filter({ created_by_id: currentUser.id }, "-created_date", 200)
          .then(asList),
        base44.entities.DumpEntry
          .filter({ created_by_id: currentUser.id }, "-created_date", 100)
          .then(asList),
      ]);

      const notes = new Map(entries.map((entry) => [entry.id, entry]));
      const seen = new Set();
      const kept = [];

      rows.forEach((row) => {
        const note = notes.get(row.entry_id);
        (row.bookmarks || []).forEach((point) => {
          const key = `${row.entry_id}:${point.key}`;
          if (seen.has(key)) return;
          seen.add(key);
          kept.push({
            key,
            label: point.label,
            detail: point.detail,
            when: point.at || row.created_date,
            noteTitle: note?.title || shortTitle(note?.text) || "A note you dropped",
          });
        });
      });

      return kept.sort((a, b) => new Date(b.when || 0) - new Date(a.when || 0));
    },
    initialData: [],
    enabled: !!currentUser,
  });

  const noteCount = new Set(points.map((point) => point.noteTitle)).size;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8 lg:py-10">
        <Link
          to="/Partner"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E4DF] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#1A1A1A] transition-colors hover:bg-[#F5F0EB]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Your wall
        </Link>

        <header className="mb-7 mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A6A3C]">Kept</p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-[#1A1A1A]">What you held on to</h1>
          <p className="mt-2 text-sm text-[#8A8580]">
            {points.length > 0
              ? `${points.length} ${points.length === 1 ? "point" : "points"} from ${noteCount} ${noteCount === 1 ? "note" : "notes"}, gathered in one place.`
              : "Everything you bookmark while digging shows up here."}
          </p>
        </header>

        {isLoading ? (
          <p className="flex items-center gap-2 text-sm text-[#8A8580]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Gathering what you kept…
          </p>
        ) : points.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#DCD6CF] bg-white/60 px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5EDE4]">
              <Bookmark className="w-5 h-5 text-[#D4A574]" />
            </div>
            <h2 className="text-base font-semibold text-[#1A1A1A]">Nothing kept yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[#8A8580]">
              Open a note and tap the bookmark beside the line that hit. It lands here.
            </p>
            <Link
              to="/Partner"
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#333]"
            >
              Back to your wall
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {points.map((point) => (
              <KeptPointCard key={point.key} point={point} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}