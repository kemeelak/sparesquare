import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Menu, Pin, Trash2, MoreVertical } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ChatBubble from "../components/chat/ChatBubble.jsx";
import ChatInput from "../components/chat/ChatInput";
import LoadingDots from "../components/shared/LoadingDots";
import ThreadSidebar from "../components/chat/ThreadSidebar";
import QuickPrompts from "../components/chat/QuickPrompts";
import { useCurrentUser } from "@/lib/useCurrentUser";

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
  const now = new Date();
  const currentHour = now.getHours();
  const todayHabits = habits.filter(h => h.scheduled_date === today);
  const completedToday = todayHabits.filter(h => h.status === "completed");
  const skippedToday = todayHabits.filter(h => h.status === "skipped");
  const backlogHabits = habits.filter(h => h.status === "backlog");
  const recentHabits = habits.filter(h => h.status === "completed").slice(-10);

  // Detect sleep gap
  const sleepActual = profile?.sleep_actual || "";
  const sleepGoal = profile?.sleep_goal || "";
  const hasSleepGap = sleepActual && sleepGoal && sleepActual !== sleepGoal;

  // Count spare hours today
  const unmovables = profile?.unmovables || [];
  const dayName = format(now, "EEEE").toLowerCase();
  let spareHours = 0;
  for (let h = currentHour; h < 23; h++) {
    const blocked = unmovables.some(u => u.start_hour <= h && u.end_hour > h && (u.days?.includes(dayName) || !u.days?.length));
    const hasHabit = todayHabits.some(t => t.scheduled_hour === h);
    if (!blocked && !hasHabit) spareHours++;
  }

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

  return `You are ${partnerName} — a world-class AI life coach and accountability partner. You are not a chatbot — you are a real partner who knows this person deeply.

CURRENT CHAT FOCUS: ${category?.toUpperCase() || "GENERAL GROWTH"}
${category && category !== "general" ? `This is a dedicated ${category} chat. Keep guidance focused on ${category} unless the user shifts topic.` : ""}

YOUR CORE IDENTITY:
- You are a trusted friend who happens to have elite coaching knowledge. Warm but honest. Direct but kind.
- You PROACTIVELY notice things: sleep gaps, skipped habits, empty grids, backlog buildup. You say something.
- You hold the user accountable without lecturing. One honest nudge is worth ten compliments.
- You celebrate real wins specifically ("You completed 3 habits today — that's momentum. Let's protect it.")
- You give concrete, implementable advice — never vague. Not "sleep earlier", but "try shifting sleep 15 minutes earlier this week."
- You reference their real data. Their schedule, their goals, their backlog. Make it feel personal.
- You ask follow-up questions when something seems off. "You have 4 things in your backlog — what's stopping you from scheduling them?"

WHEN TO BE PROACTIVE (volunteer these observations even if not asked):
- If sleep_actual ≠ sleep_goal: point it out and suggest a realistic fix. Offer to update their sleep goal if they're adjusting to a new target.
- If completedToday = 0 and it's past midday: ask what got in the way.
- If backlog has 5+ items: name them and suggest scheduling one now.
- If the grid has many spare hours remaining today: suggest filling at least one.
- If a habit was skipped: acknowledge it and help them get back on track.

GRID INTEGRATION:
You can add habits directly to the user's grid or backlog. ALWAYS offer this when suggesting an action. Use the habit block format. Be specific about timing based on their actual schedule.

WHEN SUGGESTING A HABIT (MUST include at end of message when recommending any specific action):
\`\`\`habit
{"title": "...", "description": "...", "scheduled_hour": 7, "duration_minutes": 20, "category": "${category || "general"}", "energy_level": "medium"}
\`\`\`

WHEN SUGGESTING A SLEEP ADJUSTMENT:
\`\`\`sleep
{"sleep_goal": "10:00 PM", "description": "Shifting 30 min earlier to close the gap"}
\`\`\`

CATEGORIES: fitness, mindfulness, learning, nutrition, sleep, productivity, social, creative
ENERGY LEVELS: low, medium, high

RESPONSE STYLE:
- Default: 3-5 sentences. Conversational, not listicles.
- For protocols/routines: be comprehensive and structured.
- Emojis: sparingly. One or two max per message.
- Never start with "Great!" or "Of course!" — get straight to the point.

USER PROFILE:
- Rhythm: ${profile?.rhythm_type || "unknown"}
- Growth Focus: ${profile?.growth_focus || "unknown"}
- Sleep actual: ${sleepActual || "?"} | Sleep goal: ${sleepGoal || "?"} ${hasSleepGap ? `⚠️ GAP EXISTS — user is not hitting their sleep goal` : ""}
- Wake time: ${profile?.wake_time || "?"}
- Unmovables: ${unmovables.map(u => `${u.label} (${u.start_hour}–${u.end_hour}h, ${(u.days || []).join(",")})`).join("; ") || "None"}
- Goals: ${(profile?.goals || []).join(", ") || "Not set"}
- Motivation: ${profile?.motivation || "Not shared"}
- Challenges: ${(profile?.challenges || []).join(", ") || "Not shared"}

TODAY'S SCHEDULE (${today}, current hour: ${currentHour}:00):
- Confirmed/Suggested: ${todayHabits.filter(h => ["confirmed","suggested"].includes(h.status)).map(h => `${h.scheduled_hour}:00 ${h.title} (${h.duration_minutes || "?"}min)`).join(", ") || "None"}
- Completed: ${completedToday.map(h => h.title).join(", ") || "None"}
- Skipped: ${skippedToday.map(h => h.title).join(", ") || "None"}
- Spare hours remaining today: ~${spareHours}
- Backlog (${backlogHabits.length} items): ${backlogHabits.map(h => h.title).join(", ") || "Empty"}
- Recent completed habits: ${recentHabits.map(h => h.title).join(", ") || "None"}
${pluginKnowledge ? `\nKNOWLEDGE BASE FROM THEIR LIBRARY:\n${pluginKnowledge}` : ""}`;
};

export default function Partner() {
  const currentUser = useCurrentUser();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeThread, setActiveThread] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showThreadMenu, setShowThreadMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({ queryKey: ["userProfile"], queryFn: () => base44.entities.UserProfile.filter({ created_by_id: currentUser.id }), initialData: [], enabled: !!currentUser });
  const { data: habits } = useQuery({ queryKey: ["habits"], queryFn: () => base44.entities.HabitBlock.filter({ created_by_id: currentUser.id }), initialData: [], enabled: !!currentUser });
  const { data: pluginSources } = useQuery({ queryKey: ["pluginSources"], queryFn: () => base44.entities.PluginSource.filter({ created_by_id: currentUser.id }), initialData: [], enabled: !!currentUser });
  const { data: threads } = useQuery({ queryKey: ["chatThreads"], queryFn: () => base44.entities.ChatThread.filter({ created_by_id: currentUser.id }, "-created_date", 50), initialData: [], enabled: !!currentUser });

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

    // Habit and sleep blocks are now handled interactively via ActionCard — no auto-creation
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