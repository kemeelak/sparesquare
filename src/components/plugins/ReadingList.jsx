import React, { useState } from "react";
import { BookOpen, Headphones, Video, FileText, Check, X, ArrowRight, Loader2 } from "lucide-react";

const TYPE_META = {
  book: { label: "Book", icon: BookOpen },
  podcast: { label: "Podcast", icon: Headphones },
  video: { label: "Documentary", icon: Video },
  article: { label: "Article", icon: FileText },
};

export default function ReadingList({ items = [], onFinish, onAddToLibrary, onRemove }) {
  const [finishingId, setFinishingId] = useState(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState(null);

  const queued = items.filter((i) => i.status !== "finished");
  const finished = items.filter((i) => i.status === "finished" && !i.source_id);

  const confirmFinish = async (item) => {
    setBusyId(item.id);
    await onFinish(item, note);
    setBusyId(null);
    setFinishingId(null);
    setNote("");
  };

  return (
    <section className="mt-10 pt-6 border-t border-[#E8E4DF]">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0AAA4]">Your shelf</p>
        {queued.length > 0 && (
          <span className="text-[11px] text-[#B0AAA4]">{queued.length} waiting</span>
        )}
      </div>
      <p className="text-xs text-[#8A8580] leading-relaxed mb-4">
        What you're actually reading or watching next. Go through it first — then decide what earned a place in your knowledge base.
      </p>

      {queued.length === 0 && finished.length === 0 && (
        <p className="text-xs text-[#B0AAA4] leading-relaxed">
          Nothing waiting. Next up below picks one thing that builds on what you already know.
        </p>
      )}

      <div className="space-y-3">
        {queued.map((item) => {
          const meta = TYPE_META[item.type] || TYPE_META.book;
          const Icon = meta.icon;
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-[#E8E4DF] p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F5F0EB] text-[#8A8580] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-[#B0AAA4] font-semibold">{meta.label}</p>
                  <p className="font-semibold text-[#1A1A1A] leading-snug">{item.title}</p>
                  {item.creator && <p className="text-xs text-[#8A8580]">{item.creator}</p>}
                  {item.builds_on && (
                    <p className="text-[11px] text-[#B0AAA4] mt-1">Builds on: {item.builds_on}</p>
                  )}
                </div>
                <button
                  onClick={() => onRemove(item)}
                  aria-label="Remove from shelf"
                  className="p-1.5 rounded-lg hover:bg-[#F5F0EB] flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-[#B0AAA4]" />
                </button>
              </div>

              {finishingId === item.id ? (
                <div className="mt-3">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="What stayed with you? One line, in your own words."
                    className="w-full rounded-xl border border-[#E8E4DF] bg-[#FAF8F5] px-3 py-2 text-sm text-[#1A1A1A] outline-none resize-none placeholder:text-[#B0AAA4]"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => confirmFinish(item)}
                      disabled={busyId === item.id}
                      className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-[#1A1A1A] text-white text-xs font-medium hover:bg-[#333] transition-colors disabled:opacity-60"
                    >
                      {busyId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Mark finished
                    </button>
                    <button
                      onClick={() => {
                        setFinishingId(null);
                        setNote("");
                      }}
                      className="px-3 h-9 rounded-xl text-xs font-medium text-[#8A8580] hover:bg-[#F5F0EB] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setFinishingId(item.id);
                    setNote("");
                  }}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#4A5568] hover:text-[#3A4250] transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> I finished it
                </button>
              )}
            </div>
          );
        })}

        {finished.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl border border-[#E8D5C0] p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-[#D4A574] font-semibold">Finished</p>
                <p className="font-semibold text-[#1A1A1A] leading-snug">{item.title}</p>
                {item.creator && <p className="text-xs text-[#8A8580]">{item.creator}</p>}
              </div>
              <button
                onClick={() => onRemove(item)}
                aria-label="Remove from shelf"
                className="p-1.5 rounded-lg hover:bg-[#F5F0EB] flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-[#B0AAA4]" />
              </button>
            </div>

            {item.note && (
              <p className="text-xs italic text-[#4A5568] mt-2 leading-relaxed">"{item.note}"</p>
            )}

            <button
              onClick={() => onAddToLibrary(item)}
              className="mt-3 flex items-center gap-1.5 px-3 h-9 rounded-xl bg-[#1A1A1A] text-white text-xs font-medium hover:bg-[#333] transition-colors"
            >
              Add to knowledge base <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <p className="text-[11px] text-[#B0AAA4] mt-2 leading-relaxed">
              Pulls its principles into your Partner. Only when you're ready.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}