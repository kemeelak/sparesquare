import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, X, CheckCircle, Loader2, Smartphone, RefreshCw, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { invokeAI } from "@/lib/plans";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const CONNECTOR_ID = "6ad815231cdd9de033a79a50";

export default function CalendarSync({ onClose, connected, onRefresh, blockCount = 0, icsUrl = "" }) {
  const [status, setStatus] = useState("idle");
  const [connecting, setConnecting] = useState(false);
  const [imported, setImported] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [feedInput, setFeedInput] = useState(icsUrl);
  const [feedStatus, setFeedStatus] = useState("idle"); // idle | saving | error
  const [feedError, setFeedError] = useState("");
  const queryClient = useQueryClient();

  // App-user OAuth: popup on desktop, full redirect on phones (popups are blocked there)
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const isPhone = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const popup = isPhone ? null : window.open(url, "_blank");
      if (!popup) {
        window.location.href = url;
        return;
      }
      const timer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          await onRefresh?.();
          setConnecting(false);
        }
      }, 500);
    } catch (e) {
      setErrorMsg(e.message || "Could not start connection");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await base44.connectors.disconnectAppUser(CONNECTOR_ID);
    await onRefresh?.();
  };

  // Apple/iCloud has no OAuth — a public calendar share link is read instead (read-only)
  const saveFeed = async (value) => {
    const me = await base44.auth.me();
    const profiles = await base44.entities.UserProfile.filter({ created_by_id: me.id });
    if (!profiles.length) throw new Error("Finish your profile setup first");
    await base44.entities.UserProfile.update(profiles[0].id, { calendar_feed_url: value });
    queryClient.invalidateQueries({ queryKey: ["userProfile"] });
  };

  const handleConnectFeed = async () => {
    const value = feedInput.trim();
    if (!value) return;
    setFeedStatus("saving");
    setFeedError("");
    try {
      await saveFeed(value);
      const test = await base44.functions.invoke("getCalendarEvents", {
        date: format(new Date(), "yyyy-MM-dd"),
      });
      if (test?.data?.ics_error) {
        await saveFeed("");
        setFeedInput("");
        setFeedError(`${test.data.ics_error}. Check that it's the public share link.`);
        setFeedStatus("error");
        return;
      }
      await onRefresh?.();
      setFeedStatus("idle");
    } catch (e) {
      setFeedError(e.message || "Could not connect that link");
      setFeedStatus("error");
    }
  };

  const handleRemoveFeed = async () => {
    await saveFeed("");
    setFeedInput("");
    setFeedError("");
    setFeedStatus("idle");
    await onRefresh?.();
  };

  const handleManualDescribe = async (text) => {
    setStatus("parsing");
    const result = await invokeAI("schedule_parse", {
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
    await saveBlocks(result?.blocks || []);
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
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md p-6 pb-24 lg:pb-6 max-h-[90vh] overflow-y-auto"
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

        {/* Connected state */}
        {connected && status !== "manual" && (
          <div className="space-y-4">
            <div className="bg-[#E8F0EA] rounded-2xl p-4 text-sm text-[#1A1A1A]">
              <CheckCircle className="w-5 h-5 text-[#7C9A82] mb-2" />
              <p className="font-medium mb-1">Google Calendar is connected</p>
              <p className="text-[#8A8580] text-xs">
                {blockCount > 0
                  ? `${blockCount} event${blockCount === 1 ? "" : "s"} on this day are showing on your grid as 📅 blocks.`
                  : "No events on this day. Your grid updates automatically as your calendar changes."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => { await onRefresh?.(); }}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
              <Button
                onClick={handleDisconnect}
                variant="ghost"
                className="rounded-xl text-[#8A8580]"
              >
                <Unlink className="w-4 h-4 mr-1" /> Disconnect
              </Button>
            </div>
            <button
              onClick={() => setStatus("manual")}
              className="w-full text-xs text-[#8A8580] hover:text-[#1A1A1A] pt-1"
            >
              Or describe a recurring schedule manually →
            </button>
          </div>
        )}

        {/* Not connected state */}
        {!connected && status === "idle" && (
          <div className="space-y-4">
            <div className="bg-[#F5F0EB] rounded-2xl p-4 text-sm text-[#4A5568]">
              <Smartphone className="w-5 h-5 text-[#7C9A82] mb-2" />
              <p className="font-medium mb-1">Connect Google Calendar</p>
              <p className="text-[#8A8580] text-xs">SpareSquare reads your events and maps them as 📅 blocks on your grid — so it knows exactly when you're free to grow.</p>
            </div>
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full h-12 rounded-xl bg-[#1A1A1A] hover:bg-[#333] text-white"
            >
              {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}
              {connecting ? "Opening Google..." : "Connect Google Calendar"}
            </Button>
            <button
              onClick={() => setStatus("manual")}
              className="w-full text-xs text-[#8A8580] hover:text-[#1A1A1A]"
            >
              Don't use Google? Describe your schedule →
            </button>
          </div>
        )}

        {/* Apple / iCloud — read-only public calendar link */}
        {status === "idle" && (
          <div className="mt-4 rounded-2xl border border-[#E8E4DF] p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🍎</span>
              <p className="text-sm font-semibold text-[#1A1A1A]">Apple / iCloud Calendar</p>
            </div>
            {icsUrl ? (
              <>
                <p className="text-xs text-[#8A8580] mb-3">
                  Read-only feed connected. Apple events show on your grid as 📅 blocks.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => onRefresh?.()} variant="outline" className="flex-1 rounded-xl">
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                  </Button>
                  <Button onClick={handleRemoveFeed} variant="ghost" className="rounded-xl text-[#8A8580]">
                    <Unlink className="w-4 h-4 mr-1" /> Remove
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-[#8A8580] mb-2">
                  In Apple Calendar: Share Calendar → Public Calendar → Copy Link, then paste it here.
                  Read-only, no password needed.
                </p>
                <input
                  value={feedInput}
                  onChange={(e) => setFeedInput(e.target.value)}
                  placeholder="webcal://p01-calendarws.icloud.com/ca/..."
                  className="w-full rounded-xl border border-[#E8E4DF] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 placeholder:text-[#B0AAA4]"
                />
                <Button
                  onClick={handleConnectFeed}
                  disabled={!feedInput.trim() || feedStatus === "saving"}
                  className="w-full mt-2 h-11 rounded-xl bg-[#1A1A1A] hover:bg-[#333] text-white"
                >
                  {feedStatus === "saving" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {feedStatus === "saving" ? "Checking link..." : "Connect feed"}
                </Button>
              </>
            )}
            {feedError && <p className="text-xs text-red-500 mt-2">{feedError}</p>}
          </div>
        )}

        {connecting && (
          <div className="text-center py-10">
            <Loader2 className="w-10 h-10 text-[#7C9A82] animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-[#1A1A1A]">Complete the sign-in in the popup...</p>
            <p className="text-xs text-[#8A8580] mt-1">Your grid will refresh when you're done</p>
          </div>
        )}

        {(status === "parsing") && (
          <div className="text-center py-10">
            <Loader2 className="w-10 h-10 text-[#7C9A82] animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-[#1A1A1A]">Reading your schedule...</p>
          </div>
        )}

        {status === "done" && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-[#7C9A82] mx-auto mb-3" />
            <p className="text-lg font-semibold text-[#1A1A1A]">Blocks Added!</p>
            <p className="text-sm text-[#8A8580] mt-1">{imported} recurring blocks added to your grid.</p>
            <Button onClick={onClose} className="mt-5 bg-[#7C9A82] hover:bg-[#6B8A71] text-white rounded-xl px-8">
              View Grid
            </Button>
          </div>
        )}

        {status === "manual" && (
          <ManualScheduleEntry onSubmit={handleManualDescribe} />
        )}

        {errorMsg && (
          <p className="text-center text-xs text-red-500 mt-3">{errorMsg}</p>
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
        <p className="text-xs text-[#8A8580]">Tell us your recurring commitments and we'll map them as Unmovable blocks on your grid.</p>
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