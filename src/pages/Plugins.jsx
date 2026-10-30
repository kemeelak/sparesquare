import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Search, BookOpen, Headphones, Video, FileText, Plus, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import PluginCard from "../components/plugins/PluginCard";
import AddSourceSheet from "../components/plugins/AddSourceSheet";
import ReadingList from "../components/plugins/ReadingList";
import NextReads from "../components/plugins/NextReads";

export default function Plugins() {
  const currentUser = useCurrentUser();
  const [showAdd, setShowAdd] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.filter({ created_by_id: currentUser.id }),
    enabled: !!currentUser,
  });

  const { data: sources, isLoading } = useQuery({
    queryKey: ["pluginSources"],
    queryFn: () => base44.entities.PluginSource.filter({ created_by_id: currentUser.id }, "-created_date"),
    initialData: [],
    enabled: !!currentUser,
  });

  const { data: habits = [] } = useQuery({
    queryKey: ["habits"],
    queryFn: () => base44.entities.HabitBlock.filter({ created_by_id: currentUser.id }),
    enabled: !!currentUser,
  });
  const existingTitles = habits.map((h) => h.title).filter(Boolean);

  // The shelf: what they've been pointed at, separate from what they've learned.
  const { data: readingItems = [] } = useQuery({
    queryKey: ["readingItems"],
    queryFn: () => base44.entities.ReadingItem.filter({ created_by_id: currentUser.id }, "-created_date"),
    initialData: [],
    enabled: !!currentUser,
  });
  const refreshShelf = () => queryClient.invalidateQueries({ queryKey: ["readingItems"] });

  const queueSuggestion = async (suggestion) => {
    await base44.entities.ReadingItem.create({
      title: suggestion.title,
      type: suggestion.type,
      creator: suggestion.creator || "",
      reason: suggestion.reason || "",
      builds_on: suggestion.builds_on || "",
      status: "queued",
    });
    refreshShelf();
  };

  const finishItem = async (item, note) => {
    await base44.entities.ReadingItem.update(item.id, {
      status: "finished",
      note: (note || "").trim(),
      finished_date: format(new Date(), "yyyy-MM-dd"),
    });
    refreshShelf();
  };

  const removeItem = async (item) => {
    await base44.entities.ReadingItem.delete(item.id);
    refreshShelf();
  };

  const filtered = sources.filter(
    (s) => s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Plug-in Library</h1>
          <p className="text-sm text-[#8A8580]">Feed your Partner the principles you live by</p>
        </div>
        <Button
          onClick={() => setShowAdd({})}
          className="bg-[#1A1A1A] hover:bg-[#333] text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Source
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B0AAA4]" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your library..."
          className="pl-10 h-12 rounded-xl border-[#E8E4DF] bg-white"
        />
      </div>

      {/* Sources Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <AnimatePresence>
          {filtered.map((source) => (
            <PluginCard key={source.id} source={source} queryClient={queryClient} existingTitles={existingTitles} />
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[#F5F0EB] flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-[#8A8580]" />
          </div>
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-1">No sources yet</h2>
          <p className="text-sm text-[#8A8580]">Add a book, podcast, or video — its principles become your Partner's coaching</p>
        </div>
      )}

      {/* Your shelf — read it first, decide afterwards */}
      <ReadingList
        items={readingItems}
        onFinish={finishItem}
        onRemove={removeItem}
        onAddToLibrary={(item) =>
          setShowAdd({
            title: item.title,
            type: item.type,
            reflection: item.note || "",
            readingItemId: item.id,
          })
        }
      />

      {/* What to consume next — quiet, at the bottom */}
      <NextReads
        sources={sources}
        profile={profiles[0]}
        queuedTitles={readingItems.map((i) => i.title)}
        onQueue={queueSuggestion}
      />

      {/* Add Source Sheet */}
      <AnimatePresence>
        {showAdd && (
          <AddSourceSheet
            initialTitle={showAdd.title}
            initialType={showAdd.type}
            reflection={showAdd.reflection}
            onClose={() => setShowAdd(null)}
            onAdded={async (created) => {
              if (showAdd.readingItemId) {
                await base44.entities.ReadingItem.update(showAdd.readingItemId, {
                  status: "finished",
                  source_id: created?.id || "",
                  finished_date: format(new Date(), "yyyy-MM-dd"),
                });
                refreshShelf();
              }
              queryClient.invalidateQueries({ queryKey: ["pluginSources"] });
              setShowAdd(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}