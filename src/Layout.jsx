import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import { Grid3X3, MessageCircle, BookOpen, Layers, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Layout({ children, currentPageName }) {
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      if (!window.location.pathname.includes("login")) {
        base44.auth.redirectToLogin(window.location.href);
      }
      setProfileLoaded(true);
      return;
    }
    const profiles = await base44.entities.UserProfile.list();
    if (profiles.length > 0) setProfile(profiles[0]);
    setProfileLoaded(true);
  };

  useEffect(() => {
    if (!profileLoaded) return;
    if (currentPageName === "Onboarding") return;
    if (!profile?.onboarding_complete) {
      window.location.href = createPageUrl("Onboarding");
    }
  }, [profileLoaded, profile, currentPageName]);

  if (currentPageName === "Onboarding") {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <style>{`
          :root {
            --stone: #F5F0EB;
            --stone-light: #FAF8F5;
            --charcoal: #1A1A1A;
            --sage: #7C9A82;
            --sage-light: #E8F0EA;
            --amber: #D4A574;
            --amber-light: #F5EDE4;
            --indigo: #4A5568;
            --indigo-light: #E2E8F0;
          }
          * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        `}</style>
        {children}
      </div>
    );
  }

  const partnerName = profile?.partner_name || "Partner";

  const navItems = [
    { name: "Home", icon: Grid3X3, page: "Home", label: "Grid" },
    { name: "Partner", icon: MessageCircle, page: "Partner", label: partnerName },
    { name: "Plugins", icon: BookOpen, page: "Plugins", label: "Library" },
    { name: "Backlog", icon: Layers, page: "Backlog", label: "Backlog" },
    { name: "Progress", icon: TrendingUp, page: "Progress", label: "Progress" },
    ];

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <style>{`
        :root {
          --stone: #F5F0EB;
          --stone-light: #FAF8F5;
          --charcoal: #1A1A1A;
          --sage: #7C9A82;
          --sage-light: #E8F0EA;
          --amber: #D4A574;
          --amber-light: #F5EDE4;
          --indigo: #4A5568;
          --indigo-light: #E2E8F0;
        }
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
      `}</style>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-20 flex-col items-center py-8 bg-white/80 backdrop-blur-xl border-r border-[#E8E4DF] z-50">
        <div className="mb-12">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            <span className="text-white font-bold text-sm">S²</span>
          </div>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.page)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 group
                  ${isActive ? "bg-[#1A1A1A] text-white" : "text-[#8A8580] hover:bg-[#F5F0EB] hover:text-[#1A1A1A]"}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-[#E8E4DF] z-50 px-4 pb-safe">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.page)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all
                  ${isActive ? "text-[#1A1A1A]" : "text-[#8A8580]"}`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="lg:ml-20 min-h-screen pb-20 lg:pb-0">
        {children}
      </main>
    </div>
  );
}