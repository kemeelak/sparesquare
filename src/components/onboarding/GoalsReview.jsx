import React from "react";
import { Button } from "@/components/ui/button";

function Field({ label, hint, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-xl border border-[#E8E4DF] bg-white px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 resize-none"
        style={{ fontSize: "16px" }}
      />
      {hint && <p className="text-[11px] text-[#B0AAA4] mt-1">{hint}</p>}
    </div>
  );
}

export default function GoalsReview({ values, onChange, onFinish, saving }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-[#1A1A1A]">Here's what I've got</h2>
        <p className="text-xs text-[#8A8580] mt-1">
          Edit anything you like. One per line, and more detail helps.
        </p>
      </div>

      <Field
        label="Goals"
        value={values.goals}
        onChange={(v) => onChange("goals", v)}
        hint="One goal per line."
      />
      <Field
        label="What's stopped you"
        value={values.challenges}
        onChange={(v) => onChange("challenges", v)}
        hint="One blocker per line."
      />
      <Field
        label="Your deeper why"
        value={values.motivation}
        onChange={(v) => onChange("motivation", v)}
        rows={2}
      />

      <Button
        onClick={onFinish}
        disabled={saving || !values.goals.trim()}
        className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white rounded-xl h-11 disabled:opacity-30"
      >
        {saving ? "Saving..." : "Finish ✨"}
      </Button>
    </div>
  );
}