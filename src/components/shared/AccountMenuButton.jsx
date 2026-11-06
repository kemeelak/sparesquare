import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu, User, Sparkles, LogOut, Settings } from "lucide-react";

const LINKS = [
  { to: "/Account", label: "Account", icon: User },
  { to: "/Subscription", label: "Plan & credits", icon: Sparkles },
  { to: "/Settings", label: "Settings & legal", icon: Settings },
];

// The account menu on phones, so it can sit inside whichever header a page already has.
export default function AccountMenuButton({ className }) {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setMe).catch(() => {});
  }, []);

  const initial = (me?.full_name || me?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className={className || "w-10 h-10 rounded-xl flex items-center justify-center text-[#1A1A1A] hover:bg-[#F0EBE5] transition-colors"}
      >
        <Menu className="w-5 h-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[280px] p-0 bg-[#FAF8F5]">
          <SheetHeader className="p-5 pb-4 text-left border-b border-[#E8E4DF]">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-semibold flex-shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1A1A1A] truncate">{me?.full_name || "You"}</p>
                <p className="text-xs text-[#8A8580] truncate">{me?.email}</p>
              </div>
            </div>
          </SheetHeader>

          <nav className="p-2">
            {LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-[#1A1A1A] hover:bg-[#F0EBE5] transition-colors"
              >
                <item.icon className="w-4 h-4 text-[#8A8580]" />
                {item.label}
              </Link>
            ))}

            <button
              onClick={() => base44.auth.logout()}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-[#8A8580] hover:bg-[#F0EBE5] transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}