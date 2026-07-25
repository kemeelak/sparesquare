import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Flame, UserCheck, Bell, AlertTriangle, ChevronDown, ChevronUp, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, subDays } from "date-fns";

const NUDGE_TYPES = [
  { key: "nudge",       emoji: "👊", label: "Quick Nudge",     message: "Hey! Don't forget to keep your streak going today 🔥", color: "bg-orange-50 border-orange-200" },
  { key: "hype",        emoji: "🚀", label: "Hype Up",         message: "YOU'VE GOT THIS! 🚀 Today is your day — go crush it!", color: "bg-yellow-50 border-yellow-200" },
  { key: "checkin",     emoji: "👋", label: "Check In",        message: "Hey, just checking in — how are you doing with your habits this week?", color: "bg-blue-50 border-blue-200" },
  { key: "celebration", emoji: "🎉", label: "Celebrate",       message: "I saw your streak — that's AMAZING! Keep going, you're inspiring me 🎉", color: "bg-pink-50 border-pink-200" },
  { key: "challenge",   emoji: "⚔️", label: "Challenge",       message: "I'm challenging you: can you complete ALL your habits today? I bet you can 😤", color: "bg-purple-50 border-purple-200" },
  { key: "motivation",  emoji: "✨", label: "AI Motivation",   message: null, color: "bg-green-50 border-green-200" }, // AI-generated
  { key: "custom",      emoji: "💬", label: "Custom",          message: null, color: "bg-gray-50 border-gray-200" }, // user-written
];

function calcMissedDays(habits) {
  let missed = 0;
  for (let i = 1; i <= 7; i++) {
    const dateStr = format(subDays(new Date(), i), "yyyy-MM-dd");
    const hasCompleted = habits.some(h => h.scheduled_date === dateStr && h.status === "completed");
    const hasScheduled = habits.some(h => h.scheduled_date === dateStr);
    if (hasScheduled && !hasCompleted) missed++;
    else if (hasCompleted) break;
  }
  return missed;
}

export default function AccountabilityTab({ accountabilityPartners, me, publicProfiles, myHabits, onAddPartner }) {
  const queryClient = useQueryClient();
  const [expandedPartner, setExpandedPartner] = useState(null);
  const [sendingNudge, setSendingNudge] = useState(null);
  const [generatingMotivation, setGeneratingMotivation] = useState(false);
  const [customMessageTarget, setCustomMessageTarget] = useState(null); // { partnerId, partnerName }
  const [customText, setCustomText] = useState("");

  const { data: nudges } = useQuery({
    queryKey: ["nudges"],
    queryFn: () => base44.entities.AccountabilityNudge.list(),
    initialData: [],
    enabled: !!me,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!me || nudges.length === 0) return;
    const unread = nudges.filter(n => n.to_user_id === me.id && !n.read);
    unread.forEach(n => base44.entities.AccountabilityNudge.update(n.id, { read: true }));
  }, [nudges, me]);

  const inboxNudges = nudges.filter(n => n.to_user_id === me?.id);
  const unreadCount = inboxNudges.filter(n => !n.read).length;

  const sendNudgeMutation = useMutation({
    mutationFn: ({ toUserId, toName, type, message }) =>
      base44.entities.AccountabilityNudge.create({
        from_user_id: me.id,
        to_user_id: toUserId,
        from_name: me.full_name || "Your partner",
        type,
        message,
        read: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nudges"] });
      setSendingNudge(null);
    },
  });

  const handleSendNudge = async (toUserId, toName, nudgeType) => {
    if (nudgeType === "custom") {
      setCustomMessageTarget({ partnerId: toUserId, partnerName: toName });
      setCustomText("");
      return;
    }

    setSendingNudge(toUserId + nudgeType);
    const preset = NUDGE_TYPES.find(n => n.key === nudgeType);
    let message = preset.message;

    if (nudgeType === "motivation") {
      setGeneratingMotivation(true);
      const partnerPub = publicProfiles.find(p => p.user_id === toUserId);
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Write a short (2-3 sentences), genuine and warm motivational message for an accountability partner named ${toName || "your partner"} who has a ${partnerPub?.current_streak || 0}-day habit streak. Make it personal, energizing, and not cheesy. Just the message text, no quotes.`,
      });
      message = result;
      setGeneratingMotivation(false);
    }

    sendNudgeMutation.mutate({ toUserId, toName, type: nudgeType, message });
  };

  const handleSendCustom = () => {
    if (!customText.trim() || !customMessageTarget) return;
    setSendingNudge(customMessageTarget.partnerId + "custom");
    sendNudgeMutation.mutate({
      toUserId: customMessageTarget.partnerId,
      toName: customMessageTarget.partnerName,
      type: "custom",
      message: customText.trim(),
    });
    setCustomMessageTarget(null);
    setCustomText("");
  };

  const handleAlertPartner = async (toUserId, toName) => {
    setSendingNudge(toUserId + "alert");
    sendNudgeMutation.mutate({
      toUserId,
      toName,
      type: "alert",
      message: `Hey ${toName || "friend"}, I noticed you haven't completed habits in a few days. Just checking in — you've got this! 💙`,
    });
  };

  const nudgeEmoji = { nudge: "👊", hype: "🚀", checkin: "👋", celebration: "🎉", challenge: "⚔️", motivation: "✨", custom: "💬", alert: "⚠️" };

  if (accountabilityPartners.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="w-10 h-10 text-[#E8E4DF] mx-auto mb-3" />
        <p className="font-semibold text-[#1A1A1A]">No accountability partners yet</p>
        <p className="text-sm text-[#8A8580] mt-1">Add up to 2 people who'll keep you accountable</p>
        <Button onClick={onAddPartner} className="mt-4 bg-[#1A1A1A] hover:bg-[#333] text-white rounded-xl">
          Add Partner
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Custom message modal */}
      <AnimatePresence>
        {customMessageTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setCustomMessageTarget(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#1A1A1A]">Custom Message</h3>
                  <p className="text-xs text-[#8A8580]">To {customMessageTarget.partnerName}</p>
                </div>
                <button onClick={() => setCustomMessageTarget(null)} className="p-1.5 rounded-lg hover:bg-[#F5F0EB]">
                  <X className="w-4 h-4 text-[#8A8580]" />
                </button>
              </div>

              {/* Fun emoji shortcuts */}
              <div className="flex gap-2 mb-3 flex-wrap">
                {["🔥 Keep going!", "🎯 Stay focused!", "💪 You've got this!", "⚡ Let's go!", "🏆 Crushing it!"].map(quick => (
                  <button key={quick} onClick={() => setCustomText(quick)}
                    className="text-xs px-2.5 py-1 rounded-full bg-[#F5F0EB] text-[#4A5568] hover:bg-[#E8E4DF] transition-colors">
                    {quick}
                  </button>
                ))}
              </div>

              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Write something real... or use a shortcut above 👆"
                rows={3}
                className="w-full rounded-xl border border-[#E8E4DF] px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 placeholder:text-[#B0AAA4]"
              />
              <Button
                onClick={handleSendCustom}
                disabled={!customText.trim()}
                className="w-full mt-3 bg-[#1A1A1A] hover:bg-[#333] text-white rounded-xl flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Send Message
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inbox */}
      {inboxNudges.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-[#8A8580] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            Inbox {unreadCount > 0 && <span className="bg-[#D4A574] text-white text-[10px] rounded-full px-1.5 py-0.5">{unreadCount}</span>}
          </p>
          <div className="space-y-2">
            {inboxNudges.slice(0, 5).map(n => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`rounded-2xl p-4 border flex items-start gap-3 ${!n.read ? "bg-[#FFF8F0] border-[#E8D9C8]" : "bg-white border-[#E8E4DF]"}`}
              >
                <span className="text-lg mt-0.5">{nudgeEmoji[n.type] || "💬"}</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[#1A1A1A]">{n.from_name}</p>
                  <p className="text-sm text-[#4A5568] mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-xs text-[#B0AAA4] mt-1">{n.created_date ? format(new Date(n.created_date), "MMM d, h:mm a") : ""}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Partners list */}
      <p className="text-xs font-semibold text-[#8A8580] uppercase tracking-wide mb-2">
        Your Partners ({accountabilityPartners.length}/2)
      </p>

      {accountabilityPartners.map(f => {
        const isRequester = f.requester_id === me?.id;
        const partnerId = isRequester ? f.recipient_id : f.requester_id;
        const partnerName = isRequester ? f.recipient_name : f.requester_name;
        const partnerPub = publicProfiles.find(p => p.user_id === partnerId);
        const partnerStreak = partnerPub?.current_streak || 0;
        const isExpanded = expandedPartner === f.id;
        const hasFallenOff = partnerStreak === 0 && (partnerPub?.total_completed || 0) > 3;
        const recentlySentAlert = nudges.some(
          n => n.from_user_id === me?.id && n.to_user_id === partnerId && n.type === "alert" &&
               new Date(n.created_date) > subDays(new Date(), 1)
        );

        return (
          <motion.div key={f.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden">
            {hasFallenOff && (
              <div className="bg-[#FFF3CD] border-b border-[#F5E0A0] px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#D4A030] flex-shrink-0" />
                  <p className="text-xs font-medium text-[#7A5C00]">{partnerName || "Your partner"} seems to have fallen off their streak</p>
                </div>
                {!recentlySentAlert ? (
                  <button onClick={() => handleAlertPartner(partnerId, partnerName)} disabled={sendingNudge === partnerId + "alert"}
                    className="text-xs font-semibold text-[#D4A030] hover:text-[#B8891A] whitespace-nowrap disabled:opacity-50">
                    {sendingNudge === partnerId + "alert" ? "Sending..." : "Reach out →"}
                  </button>
                ) : <span className="text-xs text-[#7A5C00]">✓ Message sent</span>}
              </div>
            )}

            <div className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#E8F0EA] flex items-center justify-center text-2xl flex-shrink-0">
                {partnerPub?.avatar_emoji || "🧑"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1A1A1A]">{partnerName || "Partner"}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <div className="flex items-center gap-1">
                    <Flame className={`w-3 h-3 ${partnerStreak > 0 ? "text-[#D4A574]" : "text-[#E8E4DF]"}`} />
                    <span className="text-xs text-[#8A8580]">{partnerStreak} day streak</span>
                  </div>
                  <span className="text-xs text-[#B0AAA4]">·</span>
                  <span className="text-xs text-[#8A8580]">{partnerPub?.total_completed || 0} total</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#7C9A82]" />
                <button onClick={() => setExpandedPartner(isExpanded ? null : f.id)}
                  className="p-1.5 rounded-lg hover:bg-[#F5F0EB] transition-colors">
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-[#8A8580]" /> : <ChevronDown className="w-4 h-4 text-[#8A8580]" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-[#F5F0EB] pt-3">
                    <p className="text-xs font-semibold text-[#8A8580] uppercase tracking-wide mb-3">Send a message</p>
                    <div className="grid grid-cols-3 gap-2">
                      {NUDGE_TYPES.map(nudgeType => {
                        const isSending = sendingNudge === partnerId + nudgeType.key;
                        const isGenerating = nudgeType.key === "motivation" && generatingMotivation;
                        const recentlySent = nudgeType.key !== "custom" && nudges.some(
                          n => n.from_user_id === me?.id && n.to_user_id === partnerId &&
                               n.type === nudgeType.key &&
                               new Date(n.created_date) > subDays(new Date(), 0.5)
                        );
                        return (
                          <button
                            key={nudgeType.key}
                            onClick={() => !recentlySent && handleSendNudge(partnerId, partnerName, nudgeType.key)}
                            disabled={isSending || recentlySent || (generatingMotivation && nudgeType.key !== "motivation")}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all
                              ${recentlySent
                                ? "bg-[#E8F0EA] border-[#C8DEC9] cursor-default"
                                : `${nudgeType.color} hover:opacity-80 active:scale-95`
                              } disabled:opacity-50`}
                          >
                            {isSending || isGenerating
                              ? <Loader2 className="w-4 h-4 animate-spin text-[#8A8580]" />
                              : <span className="text-lg">{recentlySent ? "✓" : nudgeType.emoji}</span>
                            }
                            <span className="text-[10px] font-medium text-[#4A5568] leading-tight">{nudgeType.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}