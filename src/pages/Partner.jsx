import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import DumpMode from "@/components/partner/DumpMode";
import CoachChat from "@/components/partner/CoachChat";

const MODE_KEY = "spare:partner-mode";

export default function Partner() {
  const currentUser = useCurrentUser();
  const [mode, setMode] = useState(() => {
    // A link carrying a prompt wants the conversation, not the dump.
    if (new URLSearchParams(window.location.search).get("autoPrompt")) return "talk";
    return localStorage.getItem(MODE_KEY) === "talk" ? "talk" : "dump";
  });

  const { data: profiles } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.filter({ created_by_id: currentUser.id }),
    initialData: [],
    enabled: !!currentUser,
  });
  const profile = profiles[0];
  const partnerName = profile?.partner_name || "Partner";

  const changeMode = (next) => {
    setMode(next);
    localStorage.setItem(MODE_KEY, next);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-8.5rem-env(safe-area-inset-bottom))] lg:h-screen overflow-hidden">
      <div className="px-3 py-2.5 sm:p-4 border-b border-[#E8E4DF] bg-white/70 backdrop-blur-lg flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">S²</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-[#1A1A1A] truncate">{partnerName}</h1>
            <p className="text-xs text-[#8A8580] truncate">
              {mode === "dump" ? "Dump anything. It stays yours." : "Talk it through"}
            </p>
          </div>

          <div className="flex items-center gap-0.5 bg-[#F5F0EB] rounded-xl p-0.5 flex-shrink-0">
            {[
              { id: "dump", label: "Dump" },
              { id: "talk", label: "Talk" },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => changeMode(option.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  mode === option.id ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#8A8580] hover:text-[#1A1A1A]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {mode === "dump" ? (
          <DumpMode currentUser={currentUser} profile={profile} partnerName={partnerName} />
        ) : (
          <CoachChat currentUser={currentUser} profile={profile} partnerName={partnerName} />
        )}
      </div>
    </div>
  );
}