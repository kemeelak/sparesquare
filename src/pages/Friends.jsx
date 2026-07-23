import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, Flame, Trophy, Check, X, UserCheck, Shield, ArrowLeft } from "lucide-react";
import AccountabilityTab from "@/components/accountability/AccountabilityTab";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { format, subDays, eachDayOfInterval } from "date-fns";

function calcStreak(habits) {
  const today = new Date();
  const days = eachDayOfInterval({ start: subDays(today, 29), end: today });
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const dateStr = format(days[i], "yyyy-MM-dd");
    const done = habits.some(h => h.scheduled_date === dateStr && h.status === "completed");
    if (done) streak++;
    else if (i < days.length - 1) break;
  }
  return streak;
}

export default function Friends() {
  const [me, setMe] = useState(null);
  const [activeTab, setActiveTab] = useState("leaderboard"); // leaderboard | accountability | add
  const [addMethod, setAddMethod] = useState("email"); // email | username | phone
  const [addValue, setAddValue] = useState("");
  const [addType, setAddType] = useState("friend"); // friend | accountability
  const [sending, setSending] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setMe).catch(() => {});
  }, []);

  const { data: myHabits } = useQuery({
    queryKey: ["habits"],
    queryFn: () => base44.entities.HabitBlock.list(),
    initialData: [],
  });

  const { data: friendships } = useQuery({
    queryKey: ["friendships"],
    queryFn: () => base44.entities.Friendship.list(),
    initialData: [],
    enabled: !!me,
  });

  const { data: publicProfiles } = useQuery({
    queryKey: ["publicProfiles"],
    queryFn: () => base44.entities.UserPublicProfile.list(),
    initialData: [],
  });

  // Ensure current user has a public profile
  useEffect(() => {
    if (!me || publicProfiles.length === 0) return;
    const myPub = publicProfiles.find(p => p.user_id === me.id);
    if (!myPub) {
      const myStreak = calcStreak(myHabits);
      base44.entities.UserPublicProfile.create({
        user_id: me.id,
        display_name: me.full_name || "Anonymous",
        current_streak: myStreak,
        total_completed: myHabits.filter(h => h.status === "completed").length,
      });
    } else {
      // Update streak
      const myStreak = calcStreak(myHabits);
      base44.entities.UserPublicProfile.update(myPub.id, {
        current_streak: myStreak,
        total_completed: myHabits.filter(h => h.status === "completed").length,
        display_name: me.full_name || myPub.display_name,
      });
    }
  }, [me, myHabits, publicProfiles]);

  const myFriendships = friendships.filter(
    f => f.requester_id === me?.id || f.recipient_id === me?.id
  );
  const accepted = myFriendships.filter(f => f.status === "accepted");
  const pending = myFriendships.filter(f => f.status === "pending" && f.recipient_id === me?.id);
  const accountabilityPartners = accepted.filter(f => f.type === "accountability");

  const acceptMutation = useMutation({
    mutationFn: (id) => base44.entities.Friendship.update(id, { status: "accepted" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friendships"] }),
  });

  const declineMutation = useMutation({
    mutationFn: (id) => base44.entities.Friendship.update(id, { status: "declined" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friendships"] }),
  });

  const handleSendInvite = async () => {
    if (!addValue.trim() || !me) return;
    setSending(true);
    setAddError("");
    setAddSuccess("");

    // Check accountability partner limit
    if (addType === "accountability" && accountabilityPartners.length >= 2) {
      setAddError("You can only have up to 2 accountability partners.");
      setSending(false);
      return;
    }

    // Find target user by email/username/phone in public profiles
    let targetProfile = null;
    if (addMethod === "email") {
      // Try to find by email — we invite via the platform
      targetProfile = publicProfiles.find(p => p.email === addValue.trim().toLowerCase());
    } else if (addMethod === "username") {
      targetProfile = publicProfiles.find(p => p.username?.toLowerCase() === addValue.trim().toLowerCase());
    } else if (addMethod === "phone") {
      targetProfile = publicProfiles.find(p => p.phone_number === addValue.trim());
    }

    if (!targetProfile) {
      // Try to invite via email if that method selected
      if (addMethod === "email") {
        await base44.entities.Friendship.create({
          requester_id: me.id,
          requester_name: me.full_name || "A SpareSquare user",
          requester_email: me.email,
          recipient_id: "pending_" + Date.now(),
          recipient_email: addValue.trim(),
          status: "pending",
          type: addType,
        });
        setAddSuccess(`Invite sent to ${addValue.trim()}!`);
        setAddValue("");
      } else {
        setAddError("User not found. Ask them to set a username in their profile.");
      }
      setSending(false);
      return;
    }

    // Check if already friends
    const alreadyExists = myFriendships.some(
      f => (f.requester_id === me.id && f.recipient_id === targetProfile.user_id) ||
           (f.recipient_id === me.id && f.requester_id === targetProfile.user_id)
    );
    if (alreadyExists) {
      setAddError("You're already connected with this person.");
      setSending(false);
      return;
    }

    await base44.entities.Friendship.create({
      requester_id: me.id,
      requester_name: me.full_name || "A SpareSquare user",
      requester_email: me.email,
      recipient_id: targetProfile.user_id,
      recipient_name: targetProfile.display_name,
      recipient_email: addValue.trim(),
      status: "pending",
      type: addType,
    });
    setAddSuccess("Request sent!");
    setAddValue("");
    queryClient.invalidateQueries({ queryKey: ["friendships"] });
    setSending(false);
  };

  // Build leaderboard from accepted friends + self
  const friendUserIds = accepted.map(f =>
    f.requester_id === me?.id ? f.recipient_id : f.requester_id
  );
  const leaderboardProfiles = publicProfiles.filter(
    p => p.user_id === me?.id || friendUserIds.includes(p.user_id)
  ).sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0));

  const myStreak = calcStreak(myHabits);

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to={createPageUrl("Progress")} className="p-2 rounded-xl hover:bg-[#F5F0EB] transition-colors">
          <ArrowLeft className="w-5 h-5 text-[#4A5568]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Friends</h1>
          <p className="text-sm text-[#8A8580]">Streaks, accountability, and growth together</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-[#F5F0EB] p-1 rounded-2xl">
        {[
          { key: "leaderboard", label: "🏆 Leaderboard", icon: Trophy },
          { key: "accountability", label: "🛡️ Accountability", icon: Shield },
          { key: "add", label: "➕ Add", icon: UserPlus },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === key ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#8A8580] hover:text-[#1A1A1A]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Leaderboard */}
        {activeTab === "leaderboard" && (
          <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Pending requests */}
            {pending.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-[#8A8580] uppercase tracking-wide mb-2">Pending Requests</p>
                <div className="space-y-2">
                  {pending.map(f => (
                    <div key={f.id} className="bg-[#F5EDE4] rounded-2xl p-4 border border-[#E8D9C8] flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#1A1A1A] text-sm">{f.requester_name || f.requester_email}</p>
                        <p className="text-xs text-[#8A8580]">wants to be {f.type === "accountability" ? "your accountability partner" : "friends"}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => declineMutation.mutate(f.id)} className="p-2 rounded-xl bg-white border border-[#E8E4DF] hover:bg-red-50 hover:border-red-200">
                          <X className="w-4 h-4 text-[#8A8580] hover:text-red-500" />
                        </button>
                        <button onClick={() => acceptMutation.mutate(f.id)} className="p-2 rounded-xl bg-[#7C9A82] hover:bg-[#6B8A71]">
                          <Check className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leaderboard */}
            <div className="space-y-2">
              {leaderboardProfiles.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-10 h-10 text-[#E8E4DF] mx-auto mb-3" />
                  <p className="font-semibold text-[#1A1A1A]">No friends yet</p>
                  <p className="text-sm text-[#8A8580] mt-1">Add friends to see your streak leaderboard</p>
                </div>
              ) : (
                leaderboardProfiles.map((p, i) => {
                  const isMe = p.user_id === me?.id;
                  const streak = isMe ? myStreak : (p.current_streak || 0);
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`rounded-2xl p-4 border flex items-center gap-4 ${isMe ? "bg-[#1A1A1A] border-[#1A1A1A] text-white" : "bg-white border-[#E8E4DF]"}`}
                    >
                      <span className="text-2xl">{medals[i] || `#${i + 1}`}</span>
                      <div className="w-10 h-10 rounded-xl bg-[#F5F0EB] flex items-center justify-center text-xl flex-shrink-0">
                        {p.avatar_emoji || "🧑"}
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold text-sm ${isMe ? "text-white" : "text-[#1A1A1A]"}`}>
                          {p.display_name || "Anonymous"} {isMe && "(you)"}
                        </p>
                        <p className={`text-xs ${isMe ? "text-white/60" : "text-[#8A8580]"}`}>{p.total_completed || 0} habits completed</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Flame className={`w-4 h-4 ${streak > 0 ? "text-[#D4A574]" : isMe ? "text-white/30" : "text-[#E8E4DF]"}`} />
                        <span className={`font-bold text-lg ${isMe ? "text-white" : "text-[#1A1A1A]"}`}>{streak}</span>
                        <span className={`text-xs ${isMe ? "text-white/60" : "text-[#8A8580]"}`}>day streak</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* Accountability */}
        {activeTab === "accountability" && (
          <motion.div key="accountability" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <AccountabilityTab
              accountabilityPartners={accountabilityPartners}
              me={me}
              publicProfiles={publicProfiles}
              myHabits={myHabits}
              onAddPartner={() => setActiveTab("add")}
            />
          </motion.div>
        )}

        {/* Add Friend */}
        {activeTab === "add" && (
          <motion.div key="add" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-white rounded-2xl border border-[#E8E4DF] p-5 mb-4">
              <p className="font-semibold text-[#1A1A1A] mb-4">Find someone</p>

              {/* Method selector */}
              <div className="flex gap-2 mb-4">
                {["email", "username", "phone"].map(m => (
                  <button
                    key={m}
                    onClick={() => { setAddMethod(m); setAddValue(""); setAddError(""); setAddSuccess(""); }}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${addMethod === m ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-[#4A5568] border-[#E8E4DF] hover:border-[#1A1A1A]"}`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>

              <input
                value={addValue}
                onChange={(e) => { setAddValue(e.target.value); setAddError(""); setAddSuccess(""); }}
                placeholder={addMethod === "email" ? "friend@email.com" : addMethod === "username" ? "@username" : "+1 555 0123"}
                className="w-full rounded-xl border border-[#E8E4DF] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 mb-3"
              />

              {/* Type */}
              <p className="text-xs font-semibold text-[#8A8580] uppercase tracking-wide mb-2">Connection type</p>
              <div className="flex gap-2 mb-4">
                {[
                  { key: "friend", label: "🤝 Friend (streak sharing)" },
                  { key: "accountability", label: "🛡️ Accountability partner" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setAddType(key)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all text-center ${addType === key ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-[#4A5568] border-[#E8E4DF]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {addError && <p className="text-xs text-red-500 mb-3">{addError}</p>}
              {addSuccess && <p className="text-xs text-[#7C9A82] mb-3">✓ {addSuccess}</p>}

              <Button
                onClick={handleSendInvite}
                disabled={!addValue.trim() || sending}
                className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white rounded-xl"
              >
                {sending ? "Sending..." : "Send Invite"}
              </Button>
            </div>

            {/* Set username */}
            <SetUsernameCard me={me} publicProfiles={publicProfiles} queryClient={queryClient} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SetUsernameCard({ me, publicProfiles, queryClient }) {
  const myPub = publicProfiles.find(p => p.user_id === me?.id);
  const [username, setUsername] = useState(myPub?.username || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!username.trim() || !me) return;
    setSaving(true);
    if (myPub) {
      await base44.entities.UserPublicProfile.update(myPub.id, { username: username.trim().toLowerCase() });
    } else {
      await base44.entities.UserPublicProfile.create({
        user_id: me.id,
        display_name: me.full_name || "Anonymous",
        username: username.trim().toLowerCase(),
        current_streak: 0,
        total_completed: 0,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["publicProfiles"] });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-[#F5F0EB] rounded-2xl p-4">
      <p className="text-sm font-semibold text-[#1A1A1A] mb-1">Your username</p>
      <p className="text-xs text-[#8A8580] mb-3">So friends can find you by username</p>
      <div className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
          placeholder="yourname"
          className="flex-1 rounded-xl border border-[#E8E4DF] bg-white px-4 py-2.5 text-sm focus:outline-none"
        />
        <Button
          onClick={handleSave}
          disabled={!username.trim() || saving}
          className="bg-[#7C9A82] hover:bg-[#6B8A71] text-white rounded-xl"
        >
          {saved ? "✓ Saved" : saving ? "..." : "Save"}
        </Button>
      </div>
    </div>
  );
}