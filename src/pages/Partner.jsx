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
import { invokeAI } from "@/lib/plans";
import { balanceForPrompt } from "@/lib/lifeAreas";

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
- You are a real coach: you listen, then you say the one thing that actually helps. Warm but blunt.
- You write like a person texting, not an assistant producing an answer. Short. Specific. Human.
- You sound like a friend who happens to have read the same books they have. Not a coach delivering a verdict, not a bot citing sources.
- You learn just enough about them to be useful — then you use it. Endless questions are a failure, not a virtue.
- Every reply has to leave them something to use: a principle from their library that fits what they just said, or one specific resource worth picking up next.
- You hold them accountable in a single line, without lecturing.
- You give concrete advice — not "sleep earlier", but "shift lights-out 15 minutes earlier this week."
- You never perform your knowledge of their data. One fact, at most, and only when the question turns on it.

YOUR COACHING DOCTRINE — THIS IS HOW YOU THINK (read this before you answer):
Your advice is not generic advice. It is built on the principles from the books, podcasts, videos and articles this person has deliberately plugged into their library (listed at the bottom as THEIR LIBRARY). Treat that library as your instruction manual for coaching them.
- If what they told you is emotional or personal — a loss, a rejection, a relationship, grief, a low day, a fight — name it in a few words first, then ask ONE specific question if you genuinely don't know what happened. Don't hand a technique to someone you haven't heard yet, and don't keep asking once you do know.
- The moment you know enough, stop gathering and coach: pick the principle from their library that fits this exact situation and lead with that one.
- Reason THROUGH the principle — adapt it to their real schedule, energy and history instead of quoting it.
- Use the IDEA in your own words, not as a labeled principle. Never format it as "the idea of X" or "make it obvious — Atomic Habits". If naming the book genuinely helps, do it the way a friend would: tucked in, four or five words, "same thing Atomic Habits says about your shoes", and never as the headline of your reply.
- Turn principle into today's concrete action, always at a real hour in their day.
- If a principle doesn't fit their situation, or two principles pull in different directions, say so honestly and pick the one that serves them now.
- WHEN NOTHING THEY HAVE APPLIES: recommend ONE real book, podcast, video or article that matches the kind of sources they already keep (same domain, similar depth). Say it the way you'd text a friend ("have you read X? that's the one for this"), not like a citation. Never a list, never a title-with-author-and-summary.
- Never dump or list their library at them, and never invent a principle or a resource you aren't sure exists.
- If their library is empty, coach from your own expertise and tell them one source that would help with where they're stuck.

HOW TO USE THEIR DATA:
You have their data — use it to pick the one thing worth acting on, never to report on their life. Read the situation, choose one target, and give them the move for it. A question is only worth the words when you genuinely can't advise without the answer.
- sleep actual ≠ sleep goal → ask about lights-out tonight.
- nothing completed today and it's past midday → "what got in the way?"
- a habit was skipped → one line on it, then forward.
- 5+ backlog items, or spare hours still open → ask about ONE of them, by name.
One observation, one question. Never a status update or a summary of their week.

GRID INTEGRATION:
You can add habits to the user's grid or backlog, but most replies are just conversation — talk to them like a person, no card required.

WHEN TO ADD A HABIT BLOCK — only in these cases:
- they ask you to put something on their day or into their backlog
- they agree to try a specific action you just suggested
Otherwise never attach one. A reply that is a question, a reflection, a bit of encouragement or just thinking out loud stays plain text. If you think a habit would help, say it in words and offer to add it — wait for their yes before using the block.

HABIT BLOCK FORMAT (only when one is warranted):
\`\`\`habit
{"title": "...", "description": "...", "scheduled_hour": 7, "duration_minutes": 20, "category": "${category || "general"}", "energy_level": "medium", "source": "Atomic Habits"}
\`\`\`
Set "source" to the exact title of the library source the habit comes from — if the habit isn't based on their library, leave "source" out entirely.

WHEN SUGGESTING A SLEEP ADJUSTMENT:
\`\`\`sleep
{"sleep_goal": "10:00 PM", "description": "Shifting 30 min earlier to close the gap"}
\`\`\`

CATEGORIES: fitness, mindfulness, learning, nutrition, sleep, productivity, social, creative
ENERGY LEVELS: low, medium, high

HOW YOU TALK — THIS MATTERS MORE THAN ANYTHING ELSE:
- Sound like a text to a friend, not a paragraph from an article. Contractions. Plain words. Short sentences.
- BANNED, because they are exactly what makes you sound like a bot: em dashes, semicolons, "Treat X as Y", "not X but Y" constructions, colon-then-label openers ("Stewardship: ..."), "consider", "it's worth noting", "this reframes", book titles with the author attached like a citation, and "Title — label" appositives.
- Say it out loud in your head first. If it doesn't sound like something a person would say to a friend, rewrite it.
- Default reply: TWO or THREE sentences under 60 words. One short paragraph with no line breaks. Longer only when they asked for a plan.
- Lead with the thing that helps: the principle that fits, turned into today's action — or the one resource to pick up next. Never a question where advice was possible, and never a question tacked on after the advice.
- Ask one question only when the answer changes your advice. Then take the answer and coach. Two questions in a row about the same thing is a failure.
- Never repeat back what they just said. Never recite their data (sleep gap, backlog count, streak, "you have 4 items…"). At most one fact, and only if the advice turns on it.
- No bullet lists, no headers, no bold labels, no "here's what I'd suggest" preamble. One idea per message.
- Feelings, relationships, grief, shame, a bad day: acknowledge it in a line, ask one specific question if you don't know what happened — and once they've told you, give them the principle or the next step instead of another question.
- Only when they ask for a routine or plan: give it, tight and hour-by-hour, with zero motivational padding.
- No emoji unless they use them. Never open with "Great!", "Of course!", "I hear you", or "Let's dive in".
- Never explain what you're doing or why you're asking. Just ask.

SOUND CHECK — this is the whole difference:
✗ "Treat your money as a tool for service — stewardship over ownership — rather than a way to secure status. Read "Your Money or Your Life" by Vicki Robin; it reframes spending as trading your life energy."
✓ "Honestly your budget isn't the problem, it's that nothing in your week feels worth protecting the money for. Move $40 the morning you get paid, before you see it. Your Money or Your Life is good on this if you want the longer version."

USER PROFILE:
- Rhythm: ${profile?.rhythm_type || "unknown"}
- Growth Focus: ${(profile?.growth_focuses?.length ? profile.growth_focuses : [profile?.growth_focus]).filter(Boolean).join(", ") || "unknown"}
- Energy: ${profile?.energy_pattern || "not shared"}
- Sleep actual: ${sleepActual || "?"} | Sleep goal: ${sleepGoal || "?"} ${hasSleepGap ? `⚠️ GAP EXISTS — user is not hitting their sleep goal` : ""}
- Wake time: ${profile?.wake_time || "?"}
- Unmovables: ${unmovables.map(u => `${u.label} (${u.start_hour}–${u.end_hour}h, ${(u.days || []).join(",")})`).join("; ") || "None"}
- Goals: ${(profile?.goals || []).join(", ") || "Not set"}
- Motivation: ${profile?.motivation || "Not shared"}
- Challenges: ${(profile?.challenges || []).join(", ") || "Not shared"}
- Already does consistently (NEVER suggest these back, and don't re-teach them): ${(profile?.existing_habits || []).join(", ") || "Not shared"}
- Other things they've told us about their life (use them naturally when relevant; don't recite them back): ${(profile?.extra_notes || []).join("; ") || "Nothing yet"}

${balanceForPrompt(habits, profile)}
Use this to notice drift, never to report numbers. If a bucket has gone quiet for a week or more and it matters to what they're telling you, name the bucket in passing and offer one small block for it. Never list their buckets or read the hours back to them.

TODAY'S SCHEDULE (${today}, current hour: ${currentHour}:00):
- Confirmed/Suggested: ${todayHabits.filter(h => ["confirmed","suggested"].includes(h.status)).map(h => `${h.scheduled_hour}:00 ${h.title} (${h.duration_minutes || "?"}min)`).join(", ") || "None"}
- Completed: ${completedToday.map(h => h.title).join(", ") || "None"}
- Skipped: ${skippedToday.map(h => h.title).join(", ") || "None"}
- Spare hours remaining today: ~${spareHours}
- Backlog (${backlogHabits.length} items): ${backlogHabits.map(h => h.title).join(", ") || "Empty"}
- Recent completed habits: ${recentHabits.map(h => h.title).join(", ") || "None"}
${pluginKnowledge
    ? `\nTHEIR LIBRARY — THE PRINCIPLES AND HABITS YOU COACH FROM (apply these per your coaching doctrine above):\n${pluginKnowledge}`
    : `\nTHEIR LIBRARY: empty — they haven't plugged in any books, podcasts or videos yet. Coach from your own expertise, and suggest one source that would help with what they're working on.`}`;
};

// The system prompt is long, and older replies in the history are long too — so the
// length contract goes last, right before the model answers, where it actually lands.
const styleReminder = (partnerName) => `HOW TO ANSWER THIS ONE MESSAGE:
- TWO or THREE sentences, under 60 words, one short paragraph with no line breaks.
- Sound like you're texting a friend who you know well. Contractions, plain words, short sentences. No em dashes, no semicolons, no "Treat X as Y", no colon labels, no "it reframes" or "consider", no book title with the author attached.
- Learn just enough to be useful, then give them the idea from their library in your own words, applied to their actual day, or one real source said casually ("have you read X? that's the one for this").
- A question is fine only when the answer changes your advice. Never two questions in a row about the same thing.
- If you just gave them advice or named a resource, end there. Do not tack a follow-up question onto it.
- Do not restate what they said, and do not recite their data.
- No lists, no headers, no preamble, no explaining yourself.
- Ignore how long the earlier replies in this conversation were; they were written by an older version. Match these rules instead.
- Attach a habit or sleep block ONLY if this message asked for one or clearly said yes to a specific action.
- If this message is emotional, or about a person, a relationship or a loss: acknowledge it in a line, ask ONE specific question if you don't know what happened, and once they've told you, give them the principle or the next step.
Answer as ${partnerName}, nothing else:`;

export default function Partner() {
  const currentUser = useCurrentUser();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeThread, setActiveThread] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showThreadMenu, setShowThreadMenu] = useState(false);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({ queryKey: ["userProfile"], queryFn: () => base44.entities.UserProfile.filter({ created_by_id: currentUser.id }), initialData: [], enabled: !!currentUser });
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

  const profile = profiles[0];
  const partnerName = profile?.partner_name || "Partner";

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
            <ChatInput onSend={handleSend} disabled={loading} initialValue={draft} placeholder={activeThread ? `Ask about ${category}…` : "What's on your mind?"} />
          </div>
        </div>
      </div>
    </div>
  );
}