import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Moon, RefreshCw } from "lucide-react";

export default function HealthCard() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const { data: status } = useQuery({
    queryKey: ["healthStatus"],
    queryFn: async () => (await base44.functions.invoke("healthStatus", {})).data,
  });

  const connected = !!status?.connected;

  const sync = async () => {
    setBusy(true);
    setNote("");
    const res = await base44.functions.invoke("healthSync", {});
    const result = res.data || {};
    if (result.error) setNote(result.error);
    else if (result.connected === false) setNote("Reconnect Oura to start syncing again.");
    else setNote("Synced just now");
    queryClient.invalidateQueries({ queryKey: ["healthSnapshots"] });
    queryClient.invalidateQueries({ queryKey: ["healthStatus"] });
    setBusy(false);
  };

  const connect = async () => {
    setBusy(true);
    setNote("");
    const res = await base44.functions.invoke("healthStart", {});
    if (res.data?.url) window.location.href = res.data.url;
    else {
      setNote("Oura isn't set up yet.");
      setBusy(false);
    }
  };

  // Coming back from Oura's consent screen: pull the fresh data, then tidy the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("oura");
    if (!result) return;
    const reason = params.get("reason");
    window.history.replaceState({}, "", window.location.pathname);
    if (result === "connected") sync();
    else if (result === "denied") setNote("Oura connection was cancelled.");
    else setNote(reason ? `Couldn't connect Oura — ${reason}` : "Couldn't connect Oura. Please try again.");
  }, []);

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E8E4DF] mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-[#5C8D89]" />
          <p className="font-semibold text-[#1A1A1A] text-sm">Sleep &amp; activity</p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#5C8D89] bg-[#E8F0EA] px-2 py-0.5 rounded-full">
          Oura
        </span>
      </div>

      {connected ? (
        <>
          <p className="text-xs text-[#8A8580] mb-3">
            {status?.lastSyncedAt
              ? `Last synced ${format(new Date(status.lastSyncedAt), "MMM d, h:mm a")}`
              : "Connected — no data pulled yet"}
          </p>
          <button
            onClick={sync}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            {busy ? "Syncing…" : "Sync now"}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-[#8A8580] mb-3">
            Link your Oura Ring and your sleep, readiness and activity land here every morning — and shape what your partner suggests.
          </p>
          <button
            onClick={connect}
            disabled={busy}
            className="w-full h-10 rounded-xl bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-60"
          >
            {busy ? "Opening Oura…" : "Connect Oura"}
          </button>
        </>
      )}

      {(note || status?.lastError) && (
        <p className="text-[11px] text-[#8A8580] mt-2">{note || status?.lastError}</p>
      )}
    </div>
  );
}