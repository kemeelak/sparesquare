import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Headphones, Video, FileText, ChevronDown, ChevronUp, Plus, Check, Brain, Trash2, Share2, X, Loader2 } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";

const typeIcons = {
  book: BookOpen,
  podcast: Headphones,
  video: Video,
  article: FileText,
};

const typeColors = {
  book: "bg-[#E8F0EA] text-[#7C9A82]",
  podcast: "bg-[#F5EDE4] text-[#D4A574]",
  video: "bg-[#E2E8F0] text-[#4A5568]",
  article: "bg-[#FEF3C7] text-[#D97706]",
};

export default function PluginCard({ source, queryClient }) {
  const currentUser = useCurrentUser();
  const [expandedHabits, setExpandedHabits] = useState(false);
  const [expandedLearnings, setExpandedLearnings] = useState(false);
  const [addedIds, setAddedIds] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sharingTo, setSharingTo] = useState(null);
  const [sharedTo, setSharedTo] = useState({});

  const openShare = async () => {
    setShowShare(true);
    if (!currentUser || friends.length > 0) return;
    setLoadingFriends(true);
    const [myRequests, theirRequests, allProfiles] = await Promise.all([
      base44.entities.Friendship.filter({ requester_id: currentUser.id, status: "accepted" }),
      base44.entities.Friendship.filter({ recipient_id: currentUser.id, status: "accepted" }),
      base44.entities.UserPublicProfile.list(),
    ]);
    const friendUserIds = [
      ...myRequests.map(f => f.recipient_id),
      ...theirRequests.map(f => f.requester_id),
    ];
    const friendProfiles = allProfiles.filter(p => friendUserIds.includes(p.user_id));
    setFriends(friendProfiles);
    setLoadingFriends(false);
  };

  const handleShare = async (friend) => {
    if (sharedTo[friend.user_id]) return;
    setSharingTo(friend.user_id);
    await base44.entities.PluginSource.create({
      title: source.title,
      type: source.type,
      author: source.author,
      summary: source.summary,
      habits_extracted: source.habits_extracted,
      learnings: source.learnings,
      cover_image_url: source.cover_image_url,
      // created_by_id will be set to currentUser — but we need it owned by the friend
      // Instead we store it as a "shared" copy — the friend's copy will be created in their name
      // We use a nudge/message approach: create the source in the DB owned by current user
      // and send it. Actually we create it with the friend's profile info embedded.
    });
    // We need to create the record as the friend — instead, we'll store as a shared notification
    // by creating an AccountabilityNudge of type "motivation" with the plugin source embedded
    await base44.entities.AccountabilityNudge.create({
      from_user_id: currentUser.id,
      to_user_id: friend.user_id,
      from_name: currentUser.full_name || "A friend",
      type: "motivation",
      message: `📚 Shared a ${source.type} with you: "${source.title}"${source.author ? ` by ${source.author}` : ""}. ${source.summary ? source.summary.slice(0, 120) + "…" : ""}`,
    });
    setSharingTo(null);
    setSharedTo(prev => ({ ...prev, [friend.user_id]: true }));
  };

  const handleDelete = async () => {
    if (!confirm(`Remove "${source.title}" from your library?`)) return;
    setDeleting(true);
    await base44.entities.PluginSource.delete(source.id);
    if (queryClient) queryClient.invalidateQueries({ queryKey: ["pluginSources"] });
  };
  const Icon = typeIcons[source.type] || BookOpen;
  const colorClass = typeColors[source.type] || typeColors.book;

  const addToBacklog = async (habit, index) => {
    if (addedIds[index]) return;
    await base44.entities.HabitBlock.create({
      title: habit.title,
      description: habit.description,
      source: source.title,
      duration_minutes: habit.duration_minutes || 15,
      energy_level: habit.energy_level || "medium",
      category: habit.category || "learning",
      status: "backlog",
    });
    setAddedIds(prev => ({ ...prev, [index]: true }));
    if (queryClient) queryClient.invalidateQueries({ queryKey: ["habits"] });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#1A1A1A] truncate">{source.title}</h3>
            <p className="text-xs text-[#8A8580]">{source.author || "Unknown"} · {source.type}</p>
            {source.summary && (
              <p className="text-xs text-[#8A8580] mt-1 line-clamp-2">{source.summary}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-3 items-center justify-between">
          {source.habits_extracted?.length > 0 && (
            <button
              onClick={() => setExpandedHabits(!expandedHabits)}
              className="flex items-center gap-1 text-xs font-medium text-[#7C9A82] hover:text-[#6B8A71] transition-colors"
            >
              {expandedHabits ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {source.habits_extracted.length} habits
            </button>
          )}
          {source.learnings?.length > 0 && (
            <button
              onClick={() => setExpandedLearnings(!expandedLearnings)}
              className="flex items-center gap-1 text-xs font-medium text-[#D4A574] hover:text-[#C4945A] transition-colors"
            >
              <Brain className="w-3 h-3" />
              {source.learnings.length} principles
            </button>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={openShare}
              className="p-1.5 rounded-lg text-[#C0BAB4] hover:text-[#7C9A82] hover:bg-[#E8F0EA] transition-colors"
              title="Share with a friend"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg text-[#C0BAB4] hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center"
            onClick={() => setShowShare(false)}
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-sm p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="font-bold text-[#1A1A1A]">Share with a friend</p>
                  <p className="text-xs text-[#8A8580] truncate max-w-[200px]">"{source.title}"</p>
                </div>
                <button onClick={() => setShowShare(false)} className="p-2 rounded-xl hover:bg-[#F5F0EB]">
                  <X className="w-4 h-4 text-[#8A8580]" />
                </button>
              </div>

              {loadingFriends ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#8A8580]" />
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[#8A8580]">No friends yet — add friends from the Friends page to share with them.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div key={friend.user_id} className="flex items-center justify-between gap-3 p-3 bg-[#F5F0EB] rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg">
                          {friend.avatar_emoji || "🧑"}
                        </div>
                        <p className="text-sm font-medium text-[#1A1A1A]">{friend.display_name || "Friend"}</p>
                      </div>
                      <button
                        onClick={() => handleShare(friend)}
                        disabled={sharingTo === friend.user_id || sharedTo[friend.user_id]}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          sharedTo[friend.user_id]
                            ? "bg-[#7C9A82] text-white"
                            : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                        }`}
                      >
                        {sharingTo === friend.user_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : sharedTo[friend.user_id] ? (
                          <><Check className="w-3 h-3" /> Sent</>
                        ) : (
                          <><Share2 className="w-3 h-3" /> Share</>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Habits */}
      <AnimatePresence>
        {expandedHabits && source.habits_extracted?.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[#E8E4DF] bg-[#FAF8F5] overflow-hidden"
          >
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] font-semibold text-[#7C9A82] uppercase tracking-wide mb-2">Add to Backlog</p>
              {source.habits_extracted.map((habit, i) => (
                <div key={i} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{habit.title}</p>
                    <div className="flex gap-2 mt-0.5">
                      {habit.frequency && (
                        <span className="text-[10px] text-[#8A8580]">{habit.frequency}</span>
                      )}
                      {habit.duration_minutes && (
                        <span className="text-[10px] text-[#B0AAA4]">{habit.duration_minutes}min</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => addToBacklog(habit, i)}
                    className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      addedIds[i]
                        ? "bg-[#7C9A82] text-white"
                        : "bg-white border border-[#E8E4DF] text-[#7C9A82] hover:bg-[#E8F0EA] hover:border-[#7C9A82]"
                    }`}
                  >
                    {addedIds[i] ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Learnings / Principles */}
      <AnimatePresence>
        {expandedLearnings && source.learnings?.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[#E8E4DF] bg-[#FDF8F4] overflow-hidden"
          >
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-[#D4A574] uppercase tracking-wide mb-2">Partner Principles</p>
              <div className="space-y-2">
                {source.learnings.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-[#D4A574] mt-0.5 flex-shrink-0">•</span>
                    <div>
                      <p className="text-xs font-medium text-[#1A1A1A]">{l.principle}</p>
                      {l.explanation && <p className="text-[11px] text-[#8A8580]">{l.explanation}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}