import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "../utils";
import ChatBubble from "../components/chat/ChatBubble";
import ChatInput from "../components/chat/ChatInput";
import LoadingDots from "../components/shared/LoadingDots";
import { motion } from "framer-motion";

const SYSTEM_PROMPT = `You are the SpareSquare onboarding assistant. You're warm, supportive, and conversational.
Your job is to gather info about the user through a friendly chat. Ask ONE question at a time.

Gather these in order:
1. Their work/school rhythm (9-to-5, student, night shift, freelancer, parent, other)
2. Their unmovable blocks (work hours, school, childcare, etc.) - ask for start/end times and which days
3. Their sleep schedule (when they actually sleep and when they want to sleep, plus wake time)
4. Their growth focus (fitness, business, peace, learning, creativity, relationships)

After collecting ALL info, respond with EXACTLY this JSON format at the end of your message:
\`\`\`json
{"onboarding_complete": true, "rhythm_type": "...", "unmovables": [{"label": "...", "start_hour": 9, "end_hour": 17, "days": ["monday","tuesday","wednesday","thursday","friday"]}], "sleep_actual": "...", "sleep_goal": "...", "wake_time": "...", "growth_focus": "..."}
\`\`\`

Keep responses SHORT (2-3 sentences max). Be encouraging and reference SpareSquare's mission of finding growth in spare moments.`;

export default function Onboarding() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    startChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startChat = async () => {
    // Load existing history first
    const existing = await base44.entities.ChatMessage.filter({ context: "onboarding" }, "created_date", 50);
    if (existing && existing.length > 0) {
      setMessages(existing);
      return;
    }
    setLoading(true);
    const greeting = await base44.integrations.Core.InvokeLLM({
      prompt: `${SYSTEM_PROMPT}\n\nStart the onboarding by warmly greeting the user and asking about their work/school rhythm. Keep it to 2-3 sentences.`,
    });
    const msg = { role: "assistant", content: greeting, context: "onboarding" };
    await base44.entities.ChatMessage.create(msg);
    setMessages([msg]);
    setLoading(false);
  };

  const handleSend = async (text) => {
    const userMsg = { role: "user", content: text, context: "onboarding" };
    setMessages((prev) => [...prev, userMsg]);
    await base44.entities.ChatMessage.create(userMsg);
    setLoading(true);

    const history = [...messages, userMsg]
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `${SYSTEM_PROMPT}\n\nConversation so far:\n${history}\n\nContinue the onboarding conversation. Remember to ask ONE question at a time. If you have all the info needed, output the JSON.`,
    });

    const assistantMsg = { role: "assistant", content: response, context: "onboarding" };
    await base44.entities.ChatMessage.create(assistantMsg);
    setMessages((prev) => [...prev, assistantMsg]);
    setLoading(false);

    // Check if onboarding complete
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1]);
      if (data.onboarding_complete) {
        await base44.entities.UserProfile.create({
          rhythm_type: data.rhythm_type,
          unmovables: data.unmovables || [],
          sleep_actual: data.sleep_actual,
          sleep_goal: data.sleep_goal,
          wake_time: data.wake_time,
          growth_focus: data.growth_focus,
          onboarding_complete: true,
          timezone_offset: new Date().getTimezoneOffset() / -60,
        });
        setTimeout(() => {
          window.location.href = createPageUrl("Home");
        }, 1500);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">S²</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Welcome to SpareSquare</h1>
          <p className="text-sm text-[#8A8580] mt-1">Let's map your day and find your growth windows</p>
        </motion.div>

        {/* Chat Area */}
        <div className="bg-[#F5F0EB] rounded-2xl p-4 mb-4 max-h-[50vh] overflow-y-auto">
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}
          {loading && <LoadingDots />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          disabled={loading}
          placeholder="Tell me about your schedule..."
        />

        {/* Progress */}
        <div className="flex justify-center gap-2 mt-6">
          {[0, 1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                s <= step ? "w-8 bg-[#1A1A1A]" : "w-4 bg-[#E8E4DF]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}