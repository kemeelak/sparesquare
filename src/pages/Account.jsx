import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { LogOut, ChevronRight, Sparkles, Settings as SettingsIcon } from "lucide-react";
import { fetchUsage, PLAN_INFO } from "@/lib/plans";
import CreditMeter from "@/components/account/CreditMeter";

export default function Account() {
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: usage } = useQuery({
    queryKey: ["aiUsage"],
    queryFn: fetchUsage,
  });

  const initial = (me?.full_name || me?.email || "?").trim().charAt(0).toUpperCase();
  const plan = PLAN_INFO[usage?.plan] ?? PLAN_INFO.free;

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight mb-1">Account</h1>
      <p className="text-sm text-[#8A8580] mb-6">Who you are here, and what you're on.</p>

      {/* Identity */}
      <div className="bg-white rounded-2xl border border-[#E8E4DF] p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-semibold text-lg flex-shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[#1A1A1A] truncate">{me?.full_name || "You"}</p>
          <p className="text-sm text-[#8A8580] truncate">{me?.email}</p>
        </div>
      </div>

      {/* Plan */}
      <div className="bg-white rounded-2xl border border-[#E8E4DF] p-5 mt-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#B0AAA4] font-semibold">Your plan</p>
            <p className="text-lg font-bold text-[#1A1A1A]">
              {plan.name}
              {plan.price > 0 && <span className="text-sm font-medium text-[#8A8580]"> · ${plan.price}/mo</span>}
            </p>
          </div>
          <Link
            to="/Subscription"
            className="flex items-center gap-1 text-xs font-semibold text-[#4A5568] hover:text-[#3A4250] px-3 h-9 rounded-xl hover:bg-[#F5F0EB] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> Change plan
          </Link>
        </div>

        <CreditMeter usage={usage} />
      </div>

      {/* Settings & legal */}
      <Link
        to="/Settings"
        className="mt-4 w-full bg-white rounded-2xl border border-[#E8E4DF] p-4 flex items-center justify-between text-sm font-medium text-[#1A1A1A] hover:bg-[#F5F0EB] transition-colors"
      >
        <span className="flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-[#8A8580]" /> Settings &amp; legal
        </span>
        <ChevronRight className="w-4 h-4 text-[#B0AAA4]" />
      </Link>

      {/* Sign out */}
      <button
        onClick={() => base44.auth.logout()}
        className="mt-4 w-full bg-white rounded-2xl border border-[#E8E4DF] p-4 flex items-center justify-between text-sm font-medium text-[#1A1A1A] hover:bg-[#F5F0EB] transition-colors"
      >
        <span className="flex items-center gap-2">
          <LogOut className="w-4 h-4 text-[#8A8580]" /> Sign out
        </span>
        <ChevronRight className="w-4 h-4 text-[#B0AAA4]" />
      </button>
    </div>
  );
}