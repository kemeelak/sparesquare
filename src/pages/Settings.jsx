import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AnimatePresence } from "framer-motion";
import { Car, Calendar, ShieldCheck, FileText } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import CommuteSetup from "@/components/commute/CommuteSetup";
import CalendarSync from "@/components/calendar/CalendarSync";
import HealthCard from "@/components/health/HealthCard";
import SettingsRow from "@/components/settings/SettingsRow";

export default function Settings() {
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const [showCommute, setShowCommute] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: profiles = [] } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.filter({ created_by_id: currentUser.id }),
    enabled: !!currentUser,
  });

  const {
    data: calendarRes,
    isError: calendarError,
    refetch: refetchCalendar,
  } = useQuery({
    queryKey: ["calendarEvents", today, "settings"],
    queryFn: () => base44.functions.invoke("getCalendarEvents", { date: today }),
    enabled: !!currentUser,
    retry: false,
  });

  const profile = profiles[0];
  const calendarBlocks = calendarRes?.data?.blocks || [];
  const calendarConnected = !calendarError && !!calendarRes?.data;

  const saveCommute = useMutation({
    mutationFn: (commute) => base44.entities.UserProfile.update(profile.id, { commute }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
  });

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-[#8A8580] mb-6">Your setup, your integrations, and the fine print.</p>

      <p className="text-[10px] uppercase tracking-wide font-semibold text-[#B0AAA4] mb-2">
        Your setup
      </p>
      <div className="bg-white rounded-2xl border border-[#E8E4DF] divide-y divide-[#EFEAE4] overflow-hidden">
        <SettingsRow
          icon={Car}
          label="Commute details"
          hint="Days, times, apps and what you listen to"
          status={profile?.commute?.enabled ? "On" : "Not set"}
          onClick={() => setShowCommute(true)}
        />
        <SettingsRow
          icon={Calendar}
          label="Google Calendar"
          hint="Sync your events onto your grid"
          status={calendarConnected ? "Connected" : "Off"}
          onClick={() => setShowCalendar(true)}
        />
      </div>

      <p className="text-[10px] uppercase tracking-wide font-semibold text-[#B0AAA4] mt-6 mb-2">
        Sleep &amp; activity
      </p>
      <HealthCard />

      <p className="text-[10px] uppercase tracking-wide font-semibold text-[#B0AAA4] mt-2 mb-2">
        Legal
      </p>
      <div className="bg-white rounded-2xl border border-[#E8E4DF] divide-y divide-[#EFEAE4] overflow-hidden">
        <SettingsRow
          icon={ShieldCheck}
          label="Privacy Policy"
          hint="What we collect and how it is used"
          to="/Privacy"
        />
        <SettingsRow
          icon={FileText}
          label="Terms of Service"
          hint="The rules of using SpareSquare"
          to="/Terms"
        />
      </div>

      <AnimatePresence>
        {showCommute && profile && (
          <CommuteSetup
            profile={profile}
            isSaving={saveCommute.isPending}
            onClose={() => setShowCommute(false)}
            onSave={async (commute) => {
              await saveCommute.mutateAsync(commute);
              setShowCommute(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCalendar && (
          <CalendarSync
            onClose={() => setShowCalendar(false)}
            connected={calendarConnected}
            onRefresh={refetchCalendar}
            blockCount={calendarBlocks.length}
          />
        )}
      </AnimatePresence>
    </div>
  );
}