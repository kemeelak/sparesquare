import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import ChatBubble from "../components/chat/ChatBubble";
import ChatInput from "../components/chat/ChatInput";
import LoadingDots from "../components/shared/LoadingDots";

const buildPrompt = (partnerName) => `You are ${partnerName} — a supportive, insightful AI growth coach.

YOUR PERSONALITY:
- Warm but not fluffy. Direct but not cold.
- You speak like a wise friend, not a corporate bot.
- Keep responses SHORT (2-4 sentences). Only go longer when explaining a specific protocol.

YOUR CAPABILITIES:
1. ANALYZE CONSTRAINTS: Prioritize 'Unmovable' blocks (Work, School, Childcare, Sleep). Never suggest replacing them.
2. CONTEXTUAL INTELLIGENCE: If a user mentions a book/podcast, reference specific methods from it.
3. TONE: If a user has a non-standard schedule, adapt. Their 8 AM after a night shift = their "evening."
4. PROACTIVE PLANNING: When you detect spare time, suggest tasks from their context.

WHEN SUGGESTING HABITS:
- Always output structured data like this at the end of your message when you want to add a habit to the grid:
\`\`\`habit
{"title": "...", "description": "...", "scheduled_hour": 14, "duration_minutes": 15, "category": "fitness", "energy_level": "low"}
\`\`\`

CATEGORIES: fitness, mindfulness, learning, nutrition, sleep, productivity, social, creative
ENERGY LEVELS: low, medium, high

Always be aware of their current schedule and only suggest times that are actually free (Spare Squares).`;

export default function Partner() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
    initialData: [],
  });

  const { data: habits } = useQuery({
    queryKey: ["habits"],
    queryFn: () => base44.entities.HabitBlock.list(),
    initialData: [],
  });

  const { data: pluginSources } = useQuery({
    queryKey: ["pluginSources"],
    queryFn: () => base44.entities.PluginSource.list(),
    initialData: [],
  });

  const { data: chatHistory } = useQuery({
    queryKey: ["chatMessages", "partner"],
    queryFn: () => base44.entities.ChatMessage.filter({ context: "partner" }, "created_date", 50),
    initialData: [],
  });

  const profile = profiles[0];
  const partnerName = profile?.partner_name || "Partner";

  useEffect(() => {
    if (chatHistory.length > 0) {
      setMessages(chatHistory);
    }
  }, [chatHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const buildContext = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const todayHabits = habits.filter(h => h.scheduled_date === today);
    const backlogHabits = habits.filter(h => h.status === "backlog");

    // Build plugin knowledge base
    const pluginKnowledge = pluginSources.length > 0
      ? pluginSources.map(src => {
          const learningLines = (src.learnings || [])
            .map(l => `  • ${l.principle}${l.explanation ? ` — ${l.explanation}` : ""}`)
            .join("\n");
          const habitLines = (src.habits_extracted || [])
            .map(h => `  • ${h.title}${h.frequency ? ` (${h.frequency})` : ""}`)
            .join("\n");
          return `📚 ${src.title}${src.author ? ` by ${src.author}` : ""}
${src.summary ? `  Philosophy: ${src.summary}` : ""}
${learningLines ? `  Principles (use these to shape your advice):\n${learningLines}` : ""}
${habitLines ? `  Schedulable habits (suggest these when relevant):\n${habitLines}` : ""}`;
        }).join("\n\n")
      : null;

    return `
USER PROFILE:
- Rhythm: ${profile?.rhythm_type || "unknown"}
- Growth Focus: ${profile?.growth_focus || "unknown"}
- Sleep: ${profile?.sleep_actual || "?"} → Goal: ${profile?.sleep_goal || "?"}
- Wake: ${profile?.wake_time || "?"}
- Unmovables: ${JSON.stringify(profile?.unmovables || [])}

TODAY'S SCHEDULE (${today}):
- Habits: ${todayHabits.map(h => `${h.scheduled_hour}:00 - ${h.title} (${h.status})`).join(", ") || "None"}
- Backlog: ${backlogHabits.map(h => h.title).join(", ") || "Empty"}
${pluginKnowledge ? `\nPLUGIN KNOWLEDGE BASE (apply these principles when relevant — this is the user's personal curriculum):\n${pluginKnowledge}` : ""}
`;
  };

  const handleSend = async (text) => {
    const userMsg = { role: "user", content: text, context: "partner" };
    setMessages((prev) => [...prev, userMsg]);
    await base44.entities.ChatMessage.create(userMsg);
    setLoading(true);

    const recentHistory = [...messages.slice(-10), userMsg]
      .map((m) => `${m.role === "user" ? "User" : "Partner"}: ${m.content}`)
      .join("\n");

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `${buildPrompt(partnerName)}\n\n${buildContext()}\n\nConversation:\n${recentHistory}\n\nRespond as ${partnerName}.`,
      add_context_from_internet: text.toLowerCase().includes("book") || text.toLowerCase().includes("podcast") || text.toLowerCase().includes("habit"),
    });

    const assistantMsg = { role: "assistant", content: response, context: "partner" };
    await base44.entities.ChatMessage.create(assistantMsg);
    setMessages((prev) => [...prev, assistantMsg]);
    setLoading(false);

    // Parse habit suggestions
    const habitMatch = response.match(/```habit\s*([\s\S]*?)\s*```/);
    if (habitMatch) {
      const habitData = JSON.parse(habitMatch[1]);
      await base44.entities.HabitBlock.create({
        ...habitData,
        scheduled_date: format(new Date(), "yyyy-MM-dd"),
        status: "suggested",
        source: "Partner suggestion",
      });
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    }
  };

  return (
    <div className="flex flex-col h-screen lg:h-screen">
      {/* Header */}
      <div className="p-4 lg:p-6 border-b border-[#E8E4DF] bg-white/50 backdrop-blur-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            <span className="text-white font-bold text-sm">S²</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1A1A1A]">{partnerName}</h1>
            <p className="text-xs text-[#8A8580]">AI Growth Coach · Always available</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-2xl mx-auto">
          {messages.length === 0 && !loading && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-[#F5F0EB] flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h2 className="text-lg font-semibold text-[#1A1A1A] mb-1">Hey, I'm {partnerName}</h2>
              <p className="text-sm text-[#8A8580] max-w-xs mx-auto">
                Tell me about your day, a book you're reading, or ask me to fill a spare square.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}
          {loading && <LoadingDots />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 lg:p-6 border-t border-[#E8E4DF] bg-white/50 backdrop-blur-lg mb-14 lg:mb-0">
        <div className="max-w-2xl mx-auto">
          <ChatInput
            onSend={handleSend}
            disabled={loading}
            placeholder="What's on your mind?"
          />
        </div>
      </div>
    </div>
  );
}