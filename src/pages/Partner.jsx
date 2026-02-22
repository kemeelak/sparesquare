import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Menu, Pin, Trash2, MoreVertical } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ChatBubble from "../components/chat/ChatBubble";
import ChatInput from "../components/chat/ChatInput";
import LoadingDots from "../components/shared/LoadingDots";
import ThreadSidebar from "../components/chat/ThreadSidebar";
import QuickPrompts from "../components/chat/QuickPrompts";

const categoryColors = {
  fitness: "text-orange-600", mindfulness: "text-purple-600", learning: "text-blue-600",
  nutrition: "text-green-600", sleep: "text-indigo-600", productivity: "text-yellow-600",
  social: "text-pink-600", creative: "text-rose-600", general: "text-gray-600",
};
const categoryEmoji = {
  fitness: "🏃", mindfulness: "🧘", learning: "📚", nutrition: "🥗",
  sleep: "😴", productivity: "⚡", social: "👥", creative: "🎨", general: "💬",
};

const buildSystemPrompt = (partnerName, category, profile, habits, pluginSources) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const todayHabits = habits.filter(h => h.scheduled_date === today);
  const backlogHabits = habits.filter(h => h.status === "backlog");

  const pluginKnowledge = pluginSources.length > 0
    ? pluginSources.map(src => {
        const learningLines = (src.learnings || []).map(l => `  • ${l.principle}${l.explanation ? ` — ${l.explanation}` : ""}`).join("\n");
        const habitLines = (src.habits_extracted || []).map(h => `  • ${h.title}${h.frequency ? ` (${h.frequency})` : ""}`).join("\n");
        return `📚 ${src.title}${src.author ? ` by ${src.author}` : ""}
${src.summary ? `  Philosophy: ${src.summary}` : ""}
${learningLines ? `  Principles:\n${learningLines}` : ""}
${habitLines ? `  Habits:\n${habitLines}` : ""}`;
      }).join("\n\n")
    : null;

  return `You are ${partnerName} — a world-class AI life coach specializing in helping people build better habits and live more intentionally.

CURRENT CHAT FOCUS: ${category?.toUpperCase() || "GENERAL GROWTH"}
${category && category !== "general" ? `This is a dedicated ${category} chat. Stay focused on ${category}-related guidance unless the user explicitly changes topic.` : ""}

YOUR PERSONALITY:
- Warm, direct, and deeply knowledgeable. Like a wise mentor who's also a real friend.
- Use concrete specifics. Not "try meditating" — say "do box breathing: 4s in, 4s hold, 4s out, 4s hold. Do 4 rounds."
- Ask clarifying questions when needed. Don't give generic advice.
- Reference their actual schedule, goals, and what they've told you.
- Celebrate wins. Call out patterns. Be honest about trade-offs.
- Responses should feel like a real conversation — not a listicle. Mix encouragement with precision.

RESPONSE STYLE:
- Default to 3-5 sentences unless a protocol or routine is being requested.
- For workout routines, meal plans, or specific protocols: be comprehensive and structured.
- Use emojis sparingly but effectively.
- When you spot an opportunity to add something concrete to their grid, suggest a habit block.

WHEN SUGGESTING HABITS (output at end of message):
\`\`\`habit
{"title": "...", "description": "...", "scheduled_hour": 7, "duration_minutes": 20, "category": "${category || "fitness"}", "energy_level": "medium"}
\`\`\`

CATEGORIES: fitness, mindfulness, learning, nutrition, sleep, productivity, social, creative
ENERGY LEVELS: low, medium, high

USER PROFILE:
- Rhythm: ${profile?.rhythm_type || "unknown"}
- Growth Focus: ${profile?.growth_focus || "unknown"}
- Sleep: ${profile?.sleep_actual || "?"} → Goal: ${profile?.sleep_goal || "?"}
- Wake time: ${profile?.wake_time || "?"}
- Unmovable blocks: ${JSON.stringify(profile?.unmovables || [])}
- Goals: ${(profile?.goals || []).join(", ") || "Not set"}
- Motivation: ${profile?.motivation || "Not shared"}
- Challenges: ${(profile?.challenges || []).join(", ") || "Not shared"}

TODAY'S SCHEDULE (${today}):
- Habits: ${todayHabits.map(h => `${h.scheduled_hour}:00 - ${h.title} (${h.status}, ${h.duration_minutes || "?"}min)`).join(", ") || "None"}
- Backlog: ${backlogHabits.map(h => h.title).join(", ") || "Empty"}
${pluginKnowledge ? `\nPERSONAL KNOWLEDGE BASE:\n${pluginKnowledge}` : ""}`;
};

export default function Partner() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeThread, setActiveThread] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showThreadMenu, setShowThreadMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({ queryKey: ["userProfile"], queryFn: () => base44.entities.UserProfile.list(), initialData: [] });
  const { data: habits } = useQuery({ queryKey: ["habits"], queryFn: () => base44.entities.HabitBlock.list(), initialData: [] });
  const { data: pluginSources } = useQuery({ queryKey: ["pluginSources"], queryFn: () => base44.entities.PluginSource.list(), initialData: [] });
  const { data: threads } = useQuery({ queryKey: ["chatThreads"], queryFn: () => base44.entities.ChatThread.list("-created_date", 50), initialData: [] });

  const { data: threadMessages } = useQuery({
    queryKey: ["chatMessages", activeThread?.id],
    queryFn: () => activeThread
      ? base44.entities.ChatMessage.filter({ thread_id: activeThread.id }, "created_date", 100)
      : base44.entities.ChatMessage.filter({ context: "partner", thread_id: null }, "created_date", 50),
    enabled: true,
    initialData: [],
  });

  const profile = profiles[0];
  const partnerName = profile?.partner_name || "Partner";

  useEffect(() => { setMessages(threadMessages); }, [threadMessages]);

  useEffect(() => {
    if (!profile || loading) return;
    const params = new URLSearchParams(window.location.search);
    const autoPrompt = params.get("autoPrompt");
    if (autoPrompt) {
      const decoded = decodeURIComponent(autoPrompt);
      setTimeout(() => handleSend(decoded), 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nConversation:\n${recentHistory}\n\nRespond as ${partnerName}:`,
      add_context_from_internet: needsInternet,
    });

    const assistantMsg = { role: "assistant", content: response, context: "partner", thread_id: activeThread?.id || null };
    await base44.entities.ChatMessage.create(assistantMsg);
    setMessages(prev => [...prev, assistantMsg]);
    setLoading(false);

    if (activeThread) {
      const preview = text.length > 60 ? text.slice(0, 60) + "…" : text;
      await base44.entities.ChatThread.update(activeThread.id, { last_message_preview: preview });
      queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
    }

    const habitMatch = response.match(/```habit\s*([\s\S]*?)\s*```/);
    if (habitMatch) {
      try {
        const habitData = JSON.parse(habitMatch[1]);
        const scheduledHour = typeof habitData.scheduled_hour === "number" ? habitData.scheduled_hour : new Date().getHours() + 1;
        await base44.entities.HabitBlock.create({
          title: habitData.title,
          description: habitData.description || "",
          duration_minutes: habitData.duration_minutes || 30,
          category: habitData.category || "fitness",
          energy_level: habitData.energy_level || "medium",
          scheduled_hour: scheduledHour,
          scheduled_date: format(new Date(), "yyyy-MM-dd"),
          status: "confirmed",
          source: activeThread ? activeThread.name : "Partner suggestion",
        });
        queryClient.invalidateQueries({ queryKey: ["habits"] });
      } catch (e) { console.error("Failed to parse habit block:", e); }
    }
  };

  const category = activeThread?.category || "general";

  return (
    <div className="flex h-screen lg:h-screen overflow-hidden relative">
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
        <div className="p-4 border-b border-[#E8E4DF] bg-white/70 backdrop-blur-lg flex-shrink-0">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button onClick={() => setShowSidebar(true)} className="lg:hidden p-2 rounded-xl hover:bg-[#F5F0EB] transition-colors">
              <Menu className="w-5 h-5 text-[#4A5568]" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">S²</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {activeThread ? (
                  <>
                    <span className="text-base">{categoryEmoji[category]}</span>
                    <h1 className="text-base font-bold text-[#1A1A1A] truncate">{activeThread.name}</h1>
                  </>
                ) : (
                  <h1 className="text-base font-bold text-[#1A1A1A]">{partnerName}</h1>
                )}
              </div>
              <p className={`text-xs font-medium ${categoryColors[category]}`}>
                {activeThread ? `${category} · AI Coach` : "AI Growth Coach · Always available"}
              </p>
            </div>
            {activeThread && (
              <div className="relative">
                <button onClick={() => setShowThreadMenu(!showThreadMenu)} className="p-2 rounded-xl hover:bg-[#F5F0EB] transition-colors">
                  <MoreVertical className="w-4 h-4 text-[#8A8580]" />
                </button>
                <AnimatePresence>
                  {showThreadMenu && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 top-10 bg-white border border-[#E8E4DF] rounded-xl shadow-lg p-1 w-40 z-10">
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
            <ChatInput onSend={handleSend} disabled={loading} placeholder={activeThread ? `Ask about ${category}…` : "What's on your mind?"} />
          </div>
        </div>
      </div>
    </div>
  );
}