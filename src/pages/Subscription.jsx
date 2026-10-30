import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Sparkles } from "lucide-react";
import { fetchUsage, startCheckout, PLAN_INFO, FEATURE_COSTS } from "@/lib/plans";
import CreditMeter from "@/components/account/CreditMeter";

const FREE_INCLUDES = [
  "Your daily grid, habits and mood check-ins",
  "Conversational Partner coaching",
  "Library extraction and shelf suggestions",
];

const PLUS_INCLUDES = [
  "Everything in Free",
  "1,500 credits every month instead of 120",
  "Room for daily coaching plus a steady diet of books",
];

export default function Subscription() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: usage } = useQuery({ queryKey: ["aiUsage"], queryFn: fetchUsage });
  const isPlus = usage?.plan === "plus";

  const upgrade = async () => {
    setError("");
    setLoading(true);
    try {
      const url = await startCheckout(PLAN_INFO.plus.productId);
      if (url) window.location.href = url;
      else setError("Couldn't open checkout. Please try again.");
    } catch (e) {
      console.error(e);
      setError("Couldn't open checkout. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight mb-1">Plan</h1>
      <p className="text-sm text-[#8A8580] mb-6">Credits are what your Partner spends thinking with you.</p>

      <div className="bg-white rounded-2xl border border-[#E8E4DF] p-5 mb-6">
        <CreditMeter usage={usage} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Free */}
        <div className="bg-white rounded-2xl border border-[#E8E4DF] p-5 flex flex-col">
          <p className="text-[10px] uppercase tracking-wide text-[#B0AAA4] font-semibold">Free</p>
          <p className="text-2xl font-bold text-[#1A1A1A] mt-1">$0</p>
          <p className="text-xs text-[#8A8580] mt-1 leading-relaxed">{PLAN_INFO.free.blurb}</p>
          <p className="text-xs font-medium text-[#4A5568] mt-3">
            {PLAN_INFO.free.credits.toLocaleString()} credits / month
          </p>
          <ul className="mt-4 space-y-2 flex-1">
            {FREE_INCLUDES.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-[#4A5568] leading-relaxed">
                <Check className="w-3.5 h-3.5 text-[#B0AAA4] mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-5 h-11 rounded-xl bg-[#F5F0EB] text-[#8A8580] text-sm font-semibold flex items-center justify-center">
            {isPlus ? "Included in Plus" : "Your current plan"}
          </div>
        </div>

        {/* Plus */}
        <div className="bg-[#1A1A1A] rounded-2xl p-5 flex flex-col">
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-wide text-white/50 font-semibold">Plus</p>
            <Sparkles className="w-3.5 h-3.5 text-white/50" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">
            ${PLAN_INFO.plus.price}
            <span className="text-sm font-medium text-white/50"> /month</span>
          </p>
          <p className="text-xs text-white/60 mt-1 leading-relaxed">{PLAN_INFO.plus.blurb}</p>
          <p className="text-xs font-medium text-white/80 mt-3">
            {PLAN_INFO.plus.credits.toLocaleString()} credits / month
          </p>
          <ul className="mt-4 space-y-2 flex-1">
            {PLUS_INCLUDES.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-white/70 leading-relaxed">
                <Check className="w-3.5 h-3.5 text-[#9BA8B8] mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <button
            onClick={upgrade}
            disabled={isPlus || loading}
            className="mt-5 h-11 rounded-xl bg-white text-[#1A1A1A] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-60"
          >
            {isPlus ? "Your current plan" : loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upgrade to Plus"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-[#C0703F] mt-4">{error}</p>}

      {/* What credits buy */}
      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0AAA4] mb-2">What credits buy</p>
        <div className="bg-white rounded-2xl border border-[#E8E4DF] divide-y divide-[#F0EBE5]">
          {FEATURE_COSTS.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3">
              <p className="text-xs text-[#4A5568]">{row.label}</p>
              <p className="text-xs font-semibold text-[#8A8580]">{row.cost} credits</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#B0AAA4] mt-3 leading-relaxed">
          Heavier thinking costs more — pulling habits out of a book is worth more than a quick reply. You're
          only charged when the AI actually runs.
        </p>
      </div>
    </div>
  );
}