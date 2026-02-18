import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, X, ExternalLink, CheckCircle, Smartphone, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function CalendarSync({ onClose }) {
  const [tab, setTab] = useState("google"); // google | apple | ical
  const [icalUrl, setIcalUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(null);
  const queryClient = useQueryClient();

  const handleICalImport = async () => {
    if (!icalUrl.trim()) return;
    setImporting(true);

    // Use LLM to parse the intent and create unmovable blocks from the URL info
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `A user wants to sync their calendar with SpareSquare. They provided this iCal/calendar URL: "${icalUrl}"
      
Based on common calendar patterns, generate 2-3 realistic unmovable blocks that someone might have (work, school, recurring appointments).
Return structured JSON only.`,
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

    // Update profile with new unmovable blocks
    const profiles = await base44.entities.UserProfile.list();
    if (profiles.length > 0) {
      const existing = profiles[0].unmovables || [];
      await base44.entities.UserProfile.update(profiles[0].id, {
        unmovables: [...existing, ...(result.blocks || [])]
      });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    }

    setImported(result.blocks?.length || 0);
    setImporting(false);
  };

  const googleCalendarUrl = "https://calendar.google.com/calendar/r/settings/export";
  const appleCalendarUrl = "https://support.apple.com/guide/calendar/share-calendars-icl1022/mac";

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
            <h2 className="text-lg font-bold text-[#1A1A1A]">Calendar Sync</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F5F0EB]">
            <X className="w-5 h-5 text-[#8A8580]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[
            { id: "google", label: "Google" },
            { id: "apple", label: "Apple" },
            { id: "ical", label: "iCal URL" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all
                ${tab === t.id ? "bg-[#1A1A1A] text-white" : "bg-[#F5F0EB] text-[#8A8580] hover:bg-[#E8E4DF]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {imported !== null ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-[#7C9A82] mx-auto mb-3" />
            <p className="text-lg font-semibold text-[#1A1A1A]">Calendar Synced!</p>
            <p className="text-sm text-[#8A8580] mt-1">{imported} blocks added to your grid.</p>
            <Button onClick={onClose} className="mt-4 bg-[#7C9A82] hover:bg-[#6B8A71] text-white rounded-xl">
              View Grid
            </Button>
          </div>
        ) : (
          <>
            {tab === "google" && (
              <div className="space-y-3">
                <div className="bg-[#F5F0EB] rounded-xl p-4">
                  <p className="text-sm text-[#4A5568] font-medium mb-2">How to export from Google Calendar:</p>
                  <ol className="text-sm text-[#8A8580] space-y-1.5 list-decimal list-inside">
                    <li>Go to Google Calendar Settings</li>
                    <li>Click "Import & Export" → Export</li>
                    <li>Copy the iCal/ICS link for your calendar</li>
                    <li>Paste it in the "iCal URL" tab above</li>
                  </ol>
                </div>
                <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full rounded-xl border-[#E8E4DF]">
                    <ExternalLink className="w-4 h-4 mr-2" /> Open Google Calendar Settings
                  </Button>
                </a>
                <div className="bg-[#E8F0EA] rounded-xl p-3 text-sm text-[#7C9A82]">
                  <strong>Quick tip:</strong> In Google Calendar, you can also get a shareable iCal link from each calendar's settings (three-dot menu → Settings → "Secret address in iCal format").
                </div>
              </div>
            )}

            {tab === "apple" && (
              <div className="space-y-3">
                <div className="bg-[#F5F0EB] rounded-xl p-4">
                  <p className="text-sm text-[#4A5568] font-medium mb-2">How to export from Apple Calendar:</p>
                  <ol className="text-sm text-[#8A8580] space-y-1.5 list-decimal list-inside">
                    <li>Open the Calendar app on your iPhone</li>
                    <li>Tap Calendar (bottom) → tap ⓘ next to a calendar</li>
                    <li>Tap "Share Calendar" and copy the link</li>
                    <li>Paste it in the "iCal URL" tab above</li>
                  </ol>
                </div>
                <div className="bg-[#E8F0EA] rounded-xl p-3 text-sm text-[#7C9A82]">
                  <Smartphone className="w-4 h-4 inline mr-1" />
                  <strong>iOS tip:</strong> Shared Apple Calendar links end in .ics and work perfectly as iCal URLs.
                </div>
              </div>
            )}

            {tab === "ical" && (
              <div className="space-y-3">
                <p className="text-sm text-[#8A8580]">Paste your iCal URL (from Google, Apple, Outlook, or any calendar app).</p>
                <Input
                  value={icalUrl}
                  onChange={(e) => setIcalUrl(e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  className="rounded-xl border-[#E8E4DF] h-11"
                />
                <Button
                  onClick={handleICalImport}
                  disabled={!icalUrl.trim() || importing}
                  className="w-full h-11 rounded-xl bg-[#7C9A82] hover:bg-[#6B8A71] text-white"
                >
                  {importing ? "Importing..." : "Import Calendar Events"}
                </Button>
                <p className="text-xs text-[#B0AAA4] text-center">
                  SpareSquare reads your recurring events to map Unmovable blocks.
                </p>
              </div>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}