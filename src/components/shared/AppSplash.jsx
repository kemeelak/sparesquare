import React from "react";

// Neutral first paint: shown until we know whether this person is a returning user
// or brand new, so neither the grid nor the onboarding screens flash wrongly.
export default function AppSplash() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center gap-4">
      <style>{`* { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }`}</style>
      <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center animate-pulse">
        <span className="text-white font-bold text-lg">S²</span>
      </div>
    </div>
  );
}