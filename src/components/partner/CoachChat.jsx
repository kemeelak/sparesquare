import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatInput from "@/components/chat/ChatInput";
import LoadingDots from "@/components/shared/LoadingDots";
import ThreadSidebar from "@/components/chat/ThreadSidebar";
import QuickPrompts from "@/components/chat/QuickPrompts";
import { invokeAI } from "@/lib/plans";
import { Menu, Pin, Trash2, MoreVertical } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { buildSystemPrompt, styleReminder } from "./coachPrompt";

const categoryColors = {
  fitness: "text-orange-600", mindfulness: "text-purple-600", learning: "text-blue-600",
  nutrition: "text-green-600", sleep: "text-indigo-600", productivity: "text-yellow-600",
  social: "text-pink-600", creative: "text-rose-600", general: "text-gray-600",
};
const categoryEmoji = {
  fitness: "🏃", mindfulness: "🧘", learning: "📚", nutrition: "🥗",
  sleep: "😴", productivity: "⚡", social: "👥", creative: "🎨", general: "💬",
};

export default function CoachChat({ currentUser, profile, partnerName }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeThread, setActiveThread] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showThreadMenu, setShowThreadMenu] = useState(false);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: habits } = useQuery({ queryKey: ["habits"], queryFn: () => base44.entities.HabitBlock.filter({ created_by_id: currentUser.id }), initialData: [], enabled: !!currentUser });
  const { data: pluginSources } = useQuery({ queryKey: ["pluginSources"], queryFn: () => base44.entities.PluginSource.filter({ created_by_id: currentUser.id }), initialData: [], enabled: !!currentUser });
  const { data: threads } = useQuery({ queryKey: ["chatThreads"], queryFn: () => base44.entities.ChatThread.filter({ created_by_id: currentUser.id }, "-created_date", 50), initialData: [], enabled: !!currentUser });

  const { data: threadMessages } = useQuery({
    queryKey: ["chatMessages", activeThread?.id, currentUser?.id],
    queryFn: () => activeThread
      ? base44.entities.ChatMessage.filter({ thread_id: activeThread.id, created_by_id: currentUser.id }, "created_date", 100)
      : base44.entities.ChatMessage.filter({ context: "partner", thread_id: null, created_by_id: currentUser.id }, "created_date", 50),
    enabled: !!currentUser,
    initialData: [],
  });

  useEffect(() => { setMessages(threadMessages); }, [threadMessages]);

  // A prompt arriving in the link lands in the composer, never straight in the chat:
  // the member has to send it themselves, so a crafted link can't spend their credits
  // or write into their history. The parameter is dropped so a reload can't repeat it.
  useEffect(() => {
    if (!profile) return;
    const params = new URLSearchParams(window.location.search);
    const autoPrompt = params.get("autoPrompt");
    if (!autoPrompt) return;
    setDraft(autoPrompt.slice(0, 500));
    params.delete("autoPrompt");
    const rest = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
  }, [profile]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const handleNewThread = async ({ name, category }) => {
    const thread = await base44.entities.ChatThread.create({ name, category });
    queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
    setActiveThread(thread);
    setMessages([]);
    setShowSidebar(false);
  };

  const handleSelectThread = (thread) => {
    setActiveThread(thread);
    setShowSidebar(false);
  };

  const handlePinThread = async () => {
    if (!activeThread) return;
    await base44.entities.ChatThread.update(activeThread.id, { pinned: !activeThread.pinned });
    queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
    setActiveThread(prev => ({ ...prev, pinned: !prev.pinned }));
    setShowThreadMenu(false);
  };

  const handleDeleteThread = async () => {
    if (!activeThread) return;
    await base44.entities.ChatThread.delete(activeThread.id);
    queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
    setActiveThread(null);
    setMessages([]);
    setShowThreadMenu(false);
  };

  const handleSend = async (text) => {
    const userMsg = { role: "user", content: text, context: "partner", thread_id: activeThread?.id || null };
    setMessages(prev => [...prev, userMsg]);
    await base44.entities.ChatMessage.create(userMsg);
    setLoading(true);

    const recentHistory = [...messages.slice(-12), userMsg]
      .map(m => `${m.role === "user" ? "User" : partnerName}: ${m.content}`)
      .join("\n");

    const systemPrompt = buildSystemPrompt(partnerName, activeThread?.category, profile, habits, pluginSources);
    const needsInternet = text.toLowerCase().includes("book") || text.toLowerCase().includes("research") || text.toLowerCase().includes("study");

    const response = await invokeAI("coach", {
      prompt: `${systemPrompt}\n\nConversation:\n${recentHistory}\n\n${styleReminder(partnerName)}`,
      ...(needsInternet ? { add_context_from_internet: true, model: "gemini_3_flash" } : {}),
    });

    // Out of credits — the upgrade prompt is already showing.
    if (!response) {
      setLoading(false);
      return;
    }

    const assistantMsg = { role: "assistant", content: response, context: "partner", thread_id: activeThread?.id || null };
    await base44.entities.ChatMessage.create(assistantMsg);
    setMessages(prev => [...prev, assistantMsg]);
    setLoading(false);

    if (activeThread) {
      const preview = text.length > 60 ? text.slice(0, 60) + "…" : text;
      await base44.entities.ChatThread.update(activeThread.id, { last_message_preview: preview });
      queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
    }
  };

  const category = activeThread?.category || "general";

  return (
    <div className="flex h-full min-h-0 overflow-hidden relative">
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-20 lg:hidden" onClick={() => setShowSidebar(false)} />
            <div className="fixed left-0 top-0 h-full z-30 lg:hidden">
              <ThreadSidebar threads={threads} activeThreadId={activeThread?.id} onSelectThread={handleSelectThread} onNewThread={handleNewThread} onClose={() => setShowSidebar(false)} />
            </div>
          </>
        )}
      </AnimatePresence>

      <div className="hidden lg:flex flex-col flex-shrink-0" style={{ width: "260px" }}>
        <ThreadSidebar threads={threads} activeThreadId={activeThread?.id} onSelectThread={handleSelectThread} onNewThread={handleNewThread} onClose={() => setShowSidebar(false)} />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="px-4 py-2 border-b border-[#E8E4DF] bg-white/50 flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setShowSidebar(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-[#F5F0EB] transition-colors">
            <Menu className="w-4 h-4 text-[#4A5568]" />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {activeThread ? (
              <>
                <span className="text-sm">{categoryEmoji[category]}</span>
                <span className="text-sm font-semibold text-[#1A1A1A] truncate">{activeThread.name}</span>
                <span className={`text-[11px] font-medium ${categoryColors[category]}`}>{category}</span>
              </>
            ) : (
              <span className="text-sm font-medium text-[#8A8580]">Conversations</span>
            )}
          </div>
          {activeThread && (
            <div className="relative">
              <button onClick={() => setShowThreadMenu(!showThreadMenu)} className="p-1.5 rounded-lg hover:bg-[#F5F0EB] transition-colors">
                <MoreVertical className="w-4 h-4 text-[#8A8580]" />
              </button>
              <AnimatePresence>
                {showThreadMenu && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-9 bg-white border border-[#E8E4DF] rounded-xl shadow-lg p-1 w-40 z-10">
                    <button onClick={handlePinThread} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F5F0EB] rounded-lg transition-colors">
                      <Pin className="w-3.5 h-3.5" /> {activeThread.pinned ? "Unpin" : "Pin"} thread
                    </button>
                    <button onClick={handleDeleteThread} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 text-red-600 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Delete thread
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6" style={{ WebkitOverflowScrolling: "touch" }} onClick={() => setShowThreadMenu(false)}>
          <div className="max-w-2xl mx-auto">
            {messages.length === 0 && !loading && (
              <div className="py-12">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-[#F5F0EB] flex items-center justify-center mx-auto mb-4 text-3xl">
                    {activeThread ? categoryEmoji[category] : "💬"}
                  </div>
                  <h2 className="text-lg font-semibold text-[#1A1A1A] mb-1">
                    {activeThread ? activeThread.name : `Hey, I'm ${partnerName}`}
                  </h2>
                  <p className="text-sm text-[#8A8580] max-w-xs mx-auto">
                    {activeThread
                      ? `Your dedicated ${category} space. I'll keep this focused and actionable.`
                      : "Tell me about your day, or pick a quick prompt below to get started."}
                  </p>
                </div>
                <QuickPrompts category={category} onSelect={handleSend} />
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}
            {loading && <LoadingDots />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-[#E8E4DF] bg-white/70 backdrop-blur-lg mb-14 lg:mb-0 flex-shrink-0">
          {messages.length > 0 && messages.length <= 4 && (
            <div className="max-w-2xl mx-auto px-4 pt-3">
              <QuickPrompts category={category} onSelect={handleSend} />
            </div>
          )}
          <div className="p-4 lg:p-4 max-w-2xl mx-auto">
            <ChatInput onSend={handleSend} disabled={loading} initialValue={draft} placeholder={activeThread ? `Ask about ${category}…` : "What's on your mind?"} />
          </div>
        </div>
      </div>
    </div>
  );
}