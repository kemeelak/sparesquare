import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, ChevronLeft, Loader2 } from "lucide-react";
import {
  COMMUTE_MODES,
  LISTEN_APPS,
  READ_APPS,
  WEEK_DAYS,
  START_SLOTS,
  END_SLOTS,
  TOPIC_OPTIONS,
  slotLabel,
  formatsForMode,
} from "@/lib/commute";

const TOTAL_STEPS = 6;

function Chip({ active, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${className} ${
        active
          ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
          : "bg-white text-[#4A5568] border-[#E8E4DF] hover:bg-[#F5F0EB]"
      }`}
    >
      {children}
    </button>
  );
}

function SlotSelect({ value, onChange, slots }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="flex-1 h-12 rounded-xl border border-[#E8E4DF] bg-white px-3 text-sm text-[#1A1A1A]"
    >
      {slots.map((slot) => (
        <option key={slot} value={slot}>
          {slotLabel(slot)}
        </option>
      ))}
    </select>
  );
}

export default function CommuteSetup({ profile, onSave, onClose, isSaving }) {
  const existing = profile?.commute || {};
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(existing.mode || "drive");
  const [days, setDays] = useState(
    existing.days || ["monday", "tuesday", "wednesday", "thursday", "friday"]
  );
  const [startHour, setStartHour] = useState(existing.start_hour ?? 8);
  const [endHour, setEndHour] = useState(existing.end_hour ?? 9);
  const [ridesBack, setRidesBack] = useState(existing.return_end_hour > existing.return_start_hour);
  const [returnStart, setReturnStart] = useState(existing.return_start_hour ?? 17);
  const [returnEnd, setReturnEnd] = useState(existing.return_end_hour ?? 18);
  const [audioApp, setAudioApp] = useState(existing.apps?.audio || "spotify");
  const [readingApp, setReadingApp] = useState(existing.apps?.reading || "kindle");
  const [formats, setFormats] = useState(existing.formats || ["podcasts"]);
  const [topics, setTopics] = useState(existing.topics || []);

  const modeMeta = COMMUTE_MODES[mode] || COMMUTE_MODES.drive;
  const availableFormats = formatsForMode(modeMeta);

  const toggleDay = (value) =>
    setDays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]));
  const toggleTopic = (value) =>
    setTopics((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
  const toggleFormat = (value) =>
    setFormats((prev) => (prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]));

  const canContinue =
    step === 1
      ? days.length > 0
      : step === 2
      ? endHour > startHour && (!ridesBack || returnEnd > returnStart)
      : step === 4
      ? formats.length > 0
      : step === 5
      ? topics.length > 0
      : true;

  const next = () => {
    if (step < TOTAL_STEPS - 1) return setStep(step + 1);
    onSave({
      enabled: true,
      mode,
      days,
      start_hour: startHour,
      end_hour: endHour,
      return_start_hour: ridesBack ? returnStart : null,
      return_end_hour: ridesBack ? returnEnd : null,
      apps: { audio: audioApp, reading: modeMeta.canRead ? readingApp : "none" },
      formats,
      topics,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center"
    >
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            className="p-2 -ml-2 rounded-xl hover:bg-[#F5F0EB] text-[#8A8580]"
          >
            {step === 0 ? <X className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i <= step ? "w-5 bg-[#1A1A1A]" : "w-1.5 bg-[#E8E4DF]"
                }`}
              />
            ))}
          </div>
          <span className="w-8" />
        </div>

        {step === 0 && (
          <>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">How do you travel?</h2>
            <p className="text-sm text-[#8A8580] mb-5">
              This decides what's realistic — reading on a train, audio-only in the car.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(COMMUTE_MODES).map(([value, meta]) => (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  className={`p-4 rounded-2xl border text-left transition-colors ${
                    mode === value
                      ? "border-[#1A1A1A] bg-[#F5F0EB]"
                      : "border-[#E8E4DF] hover:bg-[#FAF8F5]"
                  }`}
                >
                  <span className="text-2xl">{meta.emoji}</span>
                  <p className="text-sm font-semibold text-[#1A1A1A] mt-2">{meta.label}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">Which days?</h2>
            <p className="text-sm text-[#8A8580] mb-5">We'll mark these hours on your grid.</p>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((day) => (
                <Chip key={day.value} active={days.includes(day.value)} onClick={() => toggleDay(day.value)}>
                  {day.label}
                </Chip>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">When do you travel?</h2>
            <p className="text-sm text-[#8A8580] mb-5">Your usual window — half hours welcome.</p>
            <div className="flex items-center gap-3">
              <SlotSelect value={startHour} onChange={setStartHour} slots={START_SLOTS} />
              <span className="text-[#8A8580] text-sm">to</span>
              <SlotSelect value={endHour} onChange={setEndHour} slots={END_SLOTS} />
            </div>
            {endHour > startHour && (
              <p className="text-xs text-[#7C9A82] mt-3">
                {Math.round((endHour - startHour) * 60)} minutes of commute time per travel day.
              </p>
            )}

            <button
              onClick={() => setRidesBack(!ridesBack)}
              className={`mt-5 w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                ridesBack ? "border-[#1A1A1A] bg-[#F5F0EB]" : "border-[#E8E4DF] bg-white"
              }`}
            >
              <span className="text-sm font-medium text-[#1A1A1A]">I head back home too</span>
              <span className="text-xs text-[#8A8580]">{ridesBack ? "Yes" : "No"}</span>
            </button>
            {ridesBack && (
              <div className="flex items-center gap-3 mt-3">
                <SlotSelect value={returnStart} onChange={setReturnStart} slots={START_SLOTS} />
                <span className="text-[#8A8580] text-sm">to</span>
                <SlotSelect value={returnEnd} onChange={setReturnEnd} slots={END_SLOTS} />
              </div>
            )}
            {ridesBack && returnEnd <= returnStart && (
              <p className="text-xs text-[#B0AAA4] mt-2">The ride back needs to end after it starts.</p>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">Where do you already listen?</h2>
            <p className="text-sm text-[#8A8580] mb-4">
              Suggestions open straight into your app — nothing new to install.
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0AAA4] mb-2">Audio</p>
            <div className="flex flex-wrap gap-2">
              {LISTEN_APPS.map((app) => (
                <Chip key={app.value} active={audioApp === app.value} onClick={() => setAudioApp(app.value)}>
                  {app.label}
                </Chip>
              ))}
            </div>
            {modeMeta.canRead && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B0AAA4] mt-5 mb-2">
                  Reading
                </p>
                <div className="flex flex-wrap gap-2">
                  {READ_APPS.map((app) => (
                    <Chip key={app.value} active={readingApp === app.value} onClick={() => setReadingApp(app.value)}>
                      {app.label}
                    </Chip>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">What keeps you interested?</h2>
            <p className="text-sm text-[#8A8580] mb-5">
              Not everything has to be a podcast. Pick anything you'd genuinely do on a ride.
            </p>
            <div className="flex flex-wrap gap-2">
              {availableFormats.map((format) => (
                <Chip
                  key={format.value}
                  active={formats.includes(format.value)}
                  onClick={() => toggleFormat(format.value)}
                >
                  {format.label}
                </Chip>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">What do you like hearing about?</h2>
            <p className="text-sm text-[#8A8580] mb-5">Pick a few — we'll only suggest things in this zone.</p>
            <div className="flex flex-wrap gap-2">
              {TOPIC_OPTIONS.map((topic) => (
                <Chip key={topic} active={topics.includes(topic)} onClick={() => toggleTopic(topic)}>
                  {topic}
                </Chip>
              ))}
            </div>
          </>
        )}

        <button
          onClick={next}
          disabled={!canContinue || isSaving}
          className="w-full h-12 rounded-xl bg-[#1A1A1A] text-white text-sm font-semibold mt-6 disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {step === TOTAL_STEPS - 1 ? "Turn on commute" : "Continue"}
        </button>
      </motion.div>
    </motion.div>
  );
}