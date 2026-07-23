import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, X, CheckCircle, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";

function groupEventsByBlock(events) {
  // Ask LLM to turn events list into unmovable blocks
  return events;
}

export default function CalendarSync({ onClose }) {
  const [status, setStatus] = useState("idle"); // idle | requesting | parsing | done | error | unsupported
  const [imported, setImported] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const queryClient = useQueryClient();

  const isSupported = typeof window !== "undefined" && "navigator" in window;

  const handleSync = () => {
    setStatus("manual");
  };

  const handleManualDescribe = async (text) => {
    setStatus("parsing");
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `A user described their weekly schedule: "${text}"
      
Extract all recurring time blocks from this description and convert them into structured unmovable schedule blocks. Be precise about start/end hours (24h format integers) and which days of the week.

Only extract recurring, fixed commitments — not one-off events.`,
      response_json_schema: {
        type: "object",
        properties: {
          blocks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                start_hour: { type: "number" },
                end_hour: { type: "number" },
                days: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      }
    });
    await saveBlocks(result.blocks || []);
  };

  const processEvents = async (events) => {
    setStatus("parsing");
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Given these calendar events, extract recurring unmovable schedule blocks:
${JSON.stringify(events.slice(0, 50), null, 2)}

Group recurring events into schedule blocks with start_hour and end_hour (integers, 24h) and which days they occur.`,
      response_json_schema: {
        type: "object",
        properties: {
          blocks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                start_hour: { type: "number" },
                end_hour: { type: "number" },
                days: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      }
    });
    await saveBlocks(result.blocks || []);
  };

  const saveBlocks = async (blocks) => {
    const me = await base44.auth.me();
    const profiles = await base44.entities.UserProfile.filter({ created_by_id: me.id });
    if (profiles.length > 0) {
      const existing = profiles[0].unmovables || [];
      await base44.entities.UserProfile.update(profiles[0].id, {
        unmovables: [...existing, ...blocks]
      });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    }
    setImported(blocks.length);
    setStatus("done");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md p-6"
      >
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#7C9A82]" />
            <h2 className="text-lg font-bold text-[#1A1A1A]">Sync Calendar</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB]">
            <X className="w-5 h-5 text-[#8A8580]" />
          </button>
        </div>

        {status === "idle" && (
          <div className="space-y-4">
            <div className="bg-[#F5F0EB] rounded-2xl p-4 text-sm text-[#4A5568]">
              <Smartphone className="w-5 h-5 text-[#7C9A82] mb-2" />
              <p className="font-medium mb-1">Sync your device calendar</p>
              <p className="text-[#8A8580] text-xs">SpareSquare will read your recurring events to map Unmovable blocks on your grid — so it knows exactly when you're free to grow.</p>
            </div>
            <Button
              onClick={handleSync}
              className="w-full h-12 rounded-xl bg-[#1A1A1A] hover:bg-[#333] text-white"
            >
              <Calendar className="w-4 h-4 mr-2" /> Connect Calendar
            </Button>
          </div>
        )}

        {(status === "requesting" || status === "parsing") && (
          <div className="text-center py-10">
            <Loader2 className="w-10 h-10 text-[#7C9A82] animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-[#1A1A1A]">
              {status === "requesting" ? "Requesting calendar access..." : "Reading your schedule..."}
            </p>
            <p className="text-xs text-[#8A8580] mt-1">This will only take a moment</p>
          </div>
        )}

        {status === "done" && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-[#7C9A82] mx-auto mb-3" />
            <p className="text-lg font-semibold text-[#1A1A1A]">Calendar Synced!</p>
            <p className="text-sm text-[#8A8580] mt-1">{imported} recurring blocks added to your grid.</p>
            <Button onClick={onClose} className="mt-5 bg-[#7C9A82] hover:bg-[#6B8A71] text-white rounded-xl px-8">
              View Grid
            </Button>
          </div>
        )}

        {status === "manual" && (
          <ManualScheduleEntry onSubmit={handleManualDescribe} />
        )}

        {status === "error" && (
          <div className="text-center py-8">
            <p className="text-sm text-red-500 mb-4">{errorMsg || "Something went wrong. Please try again."}</p>
            <Button onClick={() => setStatus("idle")} variant="outline" className="rounded-xl">Try Again</Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function ManualScheduleEntry({ onSubmit }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    await onSubmit(text);
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#F5F0EB] rounded-2xl p-4 text-sm text-[#4A5568]">
        <p className="font-medium mb-1">Describe your weekly schedule</p>
        <p className="text-xs text-[#8A8580]">Tell us your recurring commitments and we'll automatically map them as Unmovable blocks on your grid.</p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. I work 9am to 5pm Monday to Friday, gym every Tuesday and Thursday 6-7pm, school run 8-9am weekdays..."
        className="w-full rounded-xl border border-[#E8E4DF] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 resize-none h-28 placeholder:text-[#B0AAA4]"
      />
      <Button
        onClick={handleSubmit}
        disabled={!text.trim() || submitting}
        className="w-full h-12 rounded-xl bg-[#7C9A82] hover:bg-[#6B8A71] text-white"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Map My Schedule"}
      </Button>
    </div>
  );
}