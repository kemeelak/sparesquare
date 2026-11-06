import React from "react";
import { Link } from "react-router-dom";
import AccountMenuButton from "./AccountMenuButton";

export default function MobileMenu() {
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#FAF8F5]/90 backdrop-blur-xl border-b border-[#E8E4DF] z-50 flex items-center justify-between px-3">
      <Link to="/Home" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
          <span className="text-white font-bold text-[11px]">S²</span>
        </div>
        <span className="text-sm font-semibold text-[#1A1A1A]">SpareSquare</span>
      </Link>

      <AccountMenuButton />
    </div>
  );
}