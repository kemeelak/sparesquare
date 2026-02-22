import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pin, X, ChevronRight } from "lucide-react";

const categoryColors = {
  fitness: "bg-orange-100 text-orange-700",
  mindfulness: "bg-purple-100 text-purple-700",
  learning: "bg-blue-100 text-blue-700",
  nutrition: "bg-green-100 text-green-700",
  sleep: "bg-indigo-100 text-indigo-700",
  productivity: "bg-yellow-100 text-yellow-700",
  social: "bg-pink-100 text-pink-700",
  creative: "bg-rose-100 text-rose-700",
  general: "bg-gray-100 text-gray-700",
};

const categoryEmoji = {
  fitness: "🏃", mindfulness: "🧘", learning: "📚",
  nutrition: "🥗", sleep: "😴", productivity: "⚡",
  social: "👥", creative: "🎨", general: "💬",
};

const CATEGORIES = ["general","fitness","mindfulness","learning","nutrition","sleep","productivity","social","creative"];

export default function ThreadSidebar({ threads, activeThreadId, onSelectThread, onNewThread, onClose }) {
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("general");

  const handleCreate = () => {
    if (!newName.trim()) return;
    onNewThread({ name: newName.trim(), category: newCategory });
    setNewName("");
    setNewCategory("general");
    setShowForm(false);
  };

  const pinned = threads.filter(t => t.pinned);
  const rest = threads.filter(t => !t.pinned);

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full w-72 bg-white border-r border-[#E8E4DF] z-30"
    >
      <div className="flex items-center justify-between p-4 border-b border-[#E8E4DF]">
        <p className="font-bold text-[#1A1A1A]">Chats</p>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="p-1.5 rounded-lg hover:bg-[#F5F0EB] transition-colors">
            <Plus className="w-4 h-4 text-[#4A5568]" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F5F0EB] transition-colors lg:hidden">
            <X className="w-4 h-4 text-[#8A8580]" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[#E8E4DF]">
            <div className="p-4 space-y-3">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                placeholder="Thread name..."
                className="w-full text-sm px-3 py-2 rounded-xl border border-[#E8E4DF] focus:outline-none focus:border-[#1A1A1A]/30"
              />
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setNewCategory(cat)}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${newCategory === cat ? categoryColors[cat] + " font-semibold" : "bg-[#F5F0EB] text-[#8A8580]"}`}>
                    {categoryEmoji[cat]} {cat}
                  </button>
                ))}
              </div>
              <button onClick={handleCreate} className="w-full text-sm py-2 rounded-xl bg-[#1A1A1A] text-white font-medium hover:bg-[#333] transition-colors">
                Create Thread
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {pinned.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-[#B0AAA4] uppercase tracking-wider px-2 mb-1">Pinned</p>
            {pinned.map(t => <ThreadRow key={t.id} thread={t} active={t.id === activeThreadId} onSelect={onSelectThread} />)}
            <div className="h-px bg-[#F0EBE5] my-2" />
          </>
        )}
        {rest.length === 0 && pinned.length === 0 && (
          <div className="text-center py-8 text-[#B0AAA4] text-sm">
            <p>No chats yet.</p>
            <p className="text-xs mt-1">Click + to start one</p>
          </div>
        )}
        {rest.map(t => <ThreadRow key={t.id} thread={t} active={t.id === activeThreadId} onSelect={onSelectThread} />)}
      </div>
    </motion.div>
  );
}

function ThreadRow({ thread, active, onSelect }) {
  const cat = thread.category || "general";
  return (
    <button
      onClick={() => onSelect(thread)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group
        ${active ? "bg-[#1A1A1A] text-white" : "hover:bg-[#F5F0EB] text-[#1A1A1A]"}`}
    >
      <span className="text-base flex-shrink-0">{categoryEmoji[cat]}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${active ? "text-white" : "text-[#1A1A1A]"}`}>{thread.name}</p>
        {thread.last_message_preview && (
          <p className={`text-xs truncate mt-0.5 ${active ? "text-white/60" : "text-[#8A8580]"}`}>{thread.last_message_preview}</p>
        )}
      </div>
      {thread.pinned && <Pin className={`w-3 h-3 flex-shrink-0 ${active ? "text-white/50" : "text-[#B0AAA4]"}`} />}
    </button>
  );
}