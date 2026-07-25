import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

const GOALS_STEPS = [
  {
    field: "goals",
    question: "Now let's go deeper 🎯\n\nWhat are **1–3 specific goals** you're working towards right now?",
    placeholder: "e.g. Run a 5K by June, Read 12 books this year, Build a consistent morning routine",
    chips: [
      "Build a morning routine", "Get fit / lose weight", "Launch my business",
      "Read more books", "Meditate daily", "Save money",
      "Learn a new skill", "Improve my sleep", "Spend more time with family",
    ],
    multi: true,
  },
  {
    field: "challenges",
    question: "What's **stopped you** from hitting these goals in the past?\n\nBeing honest here helps me give you better suggestions.",
    placeholder: "e.g. I start strong but lose motivation after 2 weeks",
    chips: [
      "I run out of time", "I lose motivation quickly", "I don't know where to start",
      "I get distracted", "I try to do too much at once", "Life gets in the way",
      "I don't track my progress", "I work better with accountability",
    ],
    multi: true,
  },
  {
    field: "motivation",
    question: "What's your **deeper why**? Why does this actually matter to you?",
    placeholder: "e.g. I want to be a role model for my kids. I want to feel proud of myself.",
    chips: [
      "To feel proud of myself", "To be a role model for my family",
      "To prove I can do it", "To feel healthier and more energised",
      "To build financial security", "To find more purpose",
    ],
    multi: false,
  },
];

export default function GoalsOnboarding({ profile, onClose }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState([]);
  const [customInput, setCustomInput] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const currentStep = GOALS_STEPS[step];

  const toggleChip = (chip) => {
    if (!currentStep.multi) {
      setSelected([chip]);
    } else {
      setSelected(prev =>
        prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
      );
    }
  };

  const handleNext = () => {
    const value = selected.length > 0
      ? (currentStep.multi ? selected : selected[0])
      : customInput.trim() || null;
    if (!value) return;

    const newAnswers = { ...answers, [currentStep.field]: value };
    setAnswers(newAnswers);
    setSelected([]);
    setCustomInput("");

    if (step + 1 >= GOALS_STEPS.length) {
      handleSave(newAnswers);
    } else {
      setStep(step + 1);
    }
  };

  const handleSave = async (finalAnswers) => {
    setSaving(true);
    try {
      const me = await base44.auth.me();
      const profiles = await base44.entities.UserProfile.filter({ created_by_id: me.id });
      const latestProfile = profiles[0];
      if (!latestProfile) return;

      await base44.entities.UserProfile.update(latestProfile.id, {
        goals: Array.isArray(finalAnswers.goals) ? finalAnswers.goals : [finalAnswers.goals],
        challenges: Array.isArray(finalAnswers.challenges) ? finalAnswers.challenges : [finalAnswers.challenges],
        motivation: Array.isArray(finalAnswers.motivation) ? finalAnswers.motivation[0] : finalAnswers.motivation,
        goals_onboarding_complete: true,
      });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const canProceed = selected.length > 0 || customInput.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-1.5">
            {GOALS_STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i < step ? "w-6 bg-[#7C9A82]" : i === step ? "w-8 bg-[#1A1A1A]" : "w-3 bg-[#E8E4DF]"}`} />
            ))}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB]">
            <X className="w-5 h-5 text-[#8A8580]" />
          </button>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-[#F5F0EB] rounded-2xl px-5 py-4 mb-4">
              <p className="text-sm leading-relaxed text-[#1A1A1A] font-medium whitespace-pre-line">
                {currentStep.question.replace(/\*\*/g, "")}
              </p>
              {currentStep.multi && (
                <p className="text-xs text-[#B0AAA4] mt-2">Select all that apply</p>
              )}
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {currentStep.chips.map((chip) => {
                const isSelected = selected.includes(chip);
                return (
                  <button
                    key={chip}
                    onClick={() => toggleChip(chip)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-150
                      ${isSelected ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-[#4A5568] border-[#E8E4DF] hover:border-[#1A1A1A]"}`}
                  >
                    {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                    {chip}
                  </button>
                );
              })}
            </div>

            {/* Custom input */}
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder={currentStep.placeholder}
              rows={2}
              className="w-full rounded-xl border border-[#E8E4DF] bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 placeholder:text-[#B0AAA4] resize-none mb-4"
              style={{ fontSize: "16px" }}
            />

            <div className="flex justify-between items-center">
              <button
                onClick={() => { if (step > 0) { setStep(step - 1); setSelected([]); setCustomInput(""); } }}
                className={`text-sm text-[#8A8580] hover:text-[#1A1A1A] transition-colors ${step === 0 ? "invisible" : ""}`}
              >
                ← Back
              </button>
              <Button
                onClick={handleNext}
                disabled={!canProceed || saving}
                className="bg-[#1A1A1A] hover:bg-[#333] text-white rounded-xl px-6 disabled:opacity-30"
              >
                {saving ? "Saving..." : step + 1 === GOALS_STEPS.length ? "Finish ✨" : "Next →"}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}