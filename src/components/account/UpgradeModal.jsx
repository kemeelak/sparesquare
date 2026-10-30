import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, ArrowRight } from "lucide-react";
import { LIMIT_EVENT, PLAN_INFO } from "@/lib/plans";

export default function UpgradeModal() {
  const [info, setInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onLimit = (event) => setInfo(event.detail || {});
    window.addEventListener(LIMIT_EVENT, onLimit);
    return () => window.removeEventListener(LIMIT_EVENT, onLimit);
  }, []);

  const limit = info?.limit ?? PLAN_INFO.free.credits;

  return (
    <Dialog open={!!info} onOpenChange={(open) => !open && setInfo(null)}>
      <DialogContent className="max-w-sm rounded-3xl">
        <div className="w-11 h-11 rounded-2xl bg-[#E8F0EA] flex items-center justify-center mb-4">
          <Sparkles className="w-5 h-5 text-[#5C8D89]" />
        </div>
        <DialogTitle className="text-lg font-bold text-[#1A1A1A]">
          You've used all {limit.toLocaleString()} credits this month
        </DialogTitle>
        <DialogDescription className="text-sm text-[#8A8580] leading-relaxed mt-2">
          Your allowance resets next month. Plus gives you {PLAN_INFO.plus.credits.toLocaleString()} credits a
          month for ${PLAN_INFO.plus.price} — enough for daily coaching and a steady diet of books.
        </DialogDescription>

        <div className="mt-5 space-y-2">
          <button
            onClick={() => {
              setInfo(null);
              navigate("/Subscription");
            }}
            className="w-full h-11 rounded-xl bg-[#1A1A1A] text-white text-sm font-semibold hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
          >
            See plans <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setInfo(null)}
            className="w-full h-11 rounded-xl text-sm font-medium text-[#8A8580] hover:bg-[#F5F0EB] transition-colors"
          >
            Wait until next month
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}