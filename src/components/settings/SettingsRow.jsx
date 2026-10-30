import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function SettingsRow({ icon: Icon, label, hint, status, onClick, to }) {
  const className =
    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F5F0EB] transition-colors";

  const inner = (
    <>
      <span className="w-9 h-9 rounded-xl bg-[#F5F0EB] flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#1A1A1A]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[#1A1A1A] leading-tight">{label}</span>
        {hint && <span className="block text-[11px] text-[#8A8580] truncate">{hint}</span>}
      </span>
      {status && <span className="text-[11px] text-[#8A8580] flex-shrink-0">{status}</span>}
      <ChevronRight className="w-4 h-4 text-[#B0AAA4] flex-shrink-0" />
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}