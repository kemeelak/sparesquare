import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const SECTIONS = [
  {
    title: "Using SpareSquare",
    body: [
      "SpareSquare helps you find spare hours in your day, plan habits into them and keep momentum with an AI partner. By creating an account you agree to these terms.",
      "You need to be at least 16 years old, and you are responsible for keeping your login secure and for what happens under your account.",
    ],
  },
  {
    title: "Not professional advice",
    body: [
      "Coaching, habit suggestions, content recommendations and health summaries are generated to be useful, not to diagnose or treat. Nothing in the app is medical, mental health, financial or legal advice. Talk to a qualified professional before acting on anything that matters.",
    ],
  },
  {
    title: "Plans, credits and payments",
    body: [
      "Free plans include a monthly allowance of AI credits. Paid plans include a larger allowance and are billed on a recurring basis through our payment provider until you cancel.",
      "AI credits are spent when you use AI features. Unused credits do not roll over or convert to cash.",
      "You can change or cancel your plan at any time; a cancellation stops the next renewal rather than the current period. Refunds are handled through the payment provider where the law requires them.",
    ],
  },
  {
    title: "Your content",
    body: [
      "The things you write, the items in your library and the notes you keep belong to you. We store and process them to run the app for you, as described in the Privacy Policy.",
      "You are responsible for what you add. Do not upload content you do not have the right to use.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "Do not use SpareSquare to break the law, to harass anyone, to reverse engineer or overload the service, or to resell access to it.",
      "We may suspend an account that abuses the service, bypasses plan limits, or puts other users at risk.",
    ],
  },
  {
    title: "Availability and changes",
    body: [
      "We work to keep SpareSquare available, but we do not promise uninterrupted service. Features may change, and integrations depend on the third-party services you connect.",
      "We may update these terms as the product evolves. If a change is significant we will make it clear in the app before it applies.",
    ],
  },
  {
    title: "Ending it",
    body: [
      "You can stop using SpareSquare whenever you like. We may close an account that breaches these terms. Either way, the sections on your content, advice and liability survive.",
    ],
  },
  {
    title: "Liability",
    body: [
      "To the extent the law allows, SpareSquare is provided as it is, and we are not liable for indirect losses or for decisions you make based on what the app suggests.",
    ],
  },
];

export default function Terms() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs font-medium text-[#8A8580] hover:text-[#1A1A1A] mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight mb-1">Terms of Service</h1>
      <p className="text-sm text-[#8A8580] mb-6">Last updated 30 October 2026</p>

      <div className="bg-white rounded-2xl border border-[#E8E4DF] p-5">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-5 last:mb-0">
            <h2 className="text-sm font-semibold text-[#1A1A1A] mb-1.5">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-[13px] leading-relaxed text-[#5C5854] mb-1.5 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}