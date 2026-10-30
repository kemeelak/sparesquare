import React from "react";
import { cn } from "@/lib/utils";

export default function CreditMeter({ usage, className }) {
  if (!usage) return null;

  const { used = 0, limit = 1, remaining = 0, plan } = usage;
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const low = remaining <= limit * 0.15;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs font-medium text-[#4A5568]">
          {used.toLocaleString()} of {limit.toLocaleString()} credits used
        </p>
        <p className={cn("text-xs font-semibold", low ? "text-[#C0703F]" : "text-[#4A5568]")}>
          {remaining.toLocaleString()} left
        </p>
      </div>
      <div className="h-2 rounded-full bg-[#F0EBE5] overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", low ? "bg-[#C0703F]" : "bg-[#4A5568]")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-[#B0AAA4] mt-2">
        {plan === "plus" ? "Plus credits refresh every month." : "Free credits refresh at the start of each month."}
      </p>
    </div>
  );
}