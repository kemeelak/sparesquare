import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardPaste, Loader2, Smartphone, ExternalLink } from "lucide-react";

const PHONE_STEPS = [
  {
    title: "Open the Calendar app",
    body: "The white calendar with the red date on your home screen.",
  },
  {
    title: "Tap Calendars at the bottom, then ⓘ",
    body: "Tap Calendars, find the calendar that holds your events, and tap the ⓘ circle beside its name. That's the only ⓘ — it's on the calendar's row, not on an event.",
  },
  {
    title: "Switch on Public Calendar",
    body: "Near the bottom of that menu, above Delete Calendar. The menu turns into a Share Link option — tap it.",
  },
  {
    title: "Tap Copy Link",
    body: "You get a long link beginning webcal:// — that is the public calendar link.",
  },
  {
    title: "Come back here and tap Paste",
    body: "We connect it and check that it reads.",
  },
];

const DESKTOP_STEPS = [
  {
    title: "Open iCloud Calendar in a browser",
    body: "Sign in with the same Apple ID as your phone if it asks.",
  },
  {
    title: "Find the calendar in the left sidebar",
    body: "Hover over its name — a share icon appears to the right of it. Click that icon (not the calendar's name).",
  },
  {
    title: "Tick Public Calendar",
    body: "That's the first section of the share panel. A long link appears underneath, starting webcal://",
  },
  {
    title: "Click Copy Link",
    body: "Right beside that link. Copied, it's your public calendar link.",
  },
  {
    title: "Come back here and click Paste",
    body: "We connect it and check that it reads.",
  },
];

const isPhone = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export default function AppleCalendarGuide({ onBack, onConnect, connecting, error }) {
  const [opened, setOpened] = useState(false);
  const [manual, setManual] = useState("");
  const [hint, setHint] = useState("");
  const [pasting, setPasting] = useState(false);
  const phone = isPhone();
  const steps = phone ? PHONE_STEPS : DESKTOP_STEPS;

  const openCalendar = () => {
    setOpened(true);
    setHint("");
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // Deep link into the phone's own Calendar app
      window.location.href = "calshow://";
    } else {
      window.open("https://www.icloud.com/calendar/", "_blank", "noopener");
    }
  };

  const pasteLink = async () => {
    setHint("");
    setPasting(true);
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        setHint("Nothing copied yet — tap Copy Link in Calendar first.");
      } else if (!/^(webcal|https?):\/\//i.test(text)) {
        setHint("That isn't a calendar link. It should start with webcal://");
      } else {
        await onConnect(text);
      }
    } catch (e) {
      setHint("Your browser blocked the clipboard — paste the link in the box below instead.");
    } finally {
      setPasting(false);
    }
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-[#8A8580] hover:text-[#1A1A1A] mb-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">🍎</span>
        <p className="text-sm font-semibold text-[#1A1A1A]">Connect iCloud Calendar</p>
      </div>
      <p className="text-xs text-[#8A8580] mb-4">
        Read-only. Apple shares a copy of the one calendar you pick — nothing is read from your
        phone.
      </p>

      <div className="space-y-2 mb-4">
        {steps.map((step, i) => {
          const active = opened ? i >= 0 : i === 0;
          return (
            <div key={step.title} className="flex gap-2.5">
              <span
                className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  active ? "bg-[#1A1A1A] text-white" : "bg-[#F5F0EB] text-[#8A8580]"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#1A1A1A] leading-tight">{step.title}</p>
                <p className="text-[11px] text-[#8A8580] leading-tight">{step.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        onClick={openCalendar}
        variant="outline"
        className="w-full h-11 rounded-xl border-[#E8E4DF] text-[#1A1A1A] mb-2"
      >
        {phone ? <Smartphone className="w-4 h-4 mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
        {opened ? "Open Calendar again" : phone ? "Open Calendar app" : "Open iCloud Calendar"}
      </Button>

      <Button
        onClick={pasteLink}
        disabled={connecting || pasting}
        className="w-full h-11 rounded-xl bg-[#1A1A1A] hover:bg-[#333] text-white"
      >
        {connecting || pasting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <ClipboardPaste className="w-4 h-4 mr-2" />
        )}
        {connecting ? "Checking link..." : "Paste copied link"}
      </Button>

      <p className="text-[11px] text-[#B0AAA4] mt-2">
        The right link always starts with webcal:// and is long. Copied something short, or an
        ordinary web address? That was the wrong button — go back to step 3.
      </p>
      <p className="text-[11px] text-[#B0AAA4] mt-1">
        No Public Calendar option? That calendar is stored only on your phone, not in iCloud — pick
        one that syncs to iCloud.
      </p>

      {opened && (
        <div className="mt-3 pt-3 border-t border-[#E8E4DF]">
          <p className="text-[11px] text-[#8A8580] mb-1.5">Or paste the link yourself</p>
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="webcal://p01-calendarws.icloud.com/ca/..."
            className="w-full rounded-xl border border-[#E8E4DF] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 placeholder:text-[#B0AAA4]"
          />
          <Button
            onClick={() => onConnect(manual)}
            disabled={!manual.trim() || connecting}
            className="w-full mt-2 h-10 rounded-xl bg-[#7C9A82] hover:bg-[#6B8A71] text-white"
          >
            Connect feed
          </Button>
        </div>
      )}

      {(hint || error) && <p className="text-xs text-red-500 mt-2">{hint || error}</p>}
    </div>
  );
}