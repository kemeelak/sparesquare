import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, BookOpen, Headphones, Video, FileText, Plus, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import PluginCard from "../components/plugins/PluginCard";
import AddSourceSheet from "../components/plugins/AddSourceSheet";

export default function Plugins() {
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: sources, isLoading } = useQuery({
    queryKey: ["pluginSources"],
    queryFn: () => base44.entities.PluginSource.list("-created_date"),
    initialData: [],
  });

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
          <p className="text-sm text-[#8A8580]">Extract habits from books, podcasts & videos</p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
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
            <PluginCard key={source.id} source={source} queryClient={queryClient} />
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[#F5F0EB] flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-[#8A8580]" />
          </div>
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-1">No sources yet</h2>
          <p className="text-sm text-[#8A8580]">Add a book, podcast, or video to extract actionable habits</p>
        </div>
      )}

      {/* Add Source Sheet */}
      <AnimatePresence>
        {showAdd && (
          <AddSourceSheet
            onClose={() => setShowAdd(false)}
            onAdded={() => {
              queryClient.invalidateQueries({ queryKey: ["pluginSources"] });
              setShowAdd(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}