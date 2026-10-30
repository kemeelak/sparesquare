import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Moon, RefreshCw, Watch } from "lucide-react";

const ICONS = { oura: Moon, fitbit: Watch };

export default function HealthCard() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState("");

  const { data: status } = useQuery({
    queryKey: ["healthStatus"],
    queryFn: async () => (await base44.functions.invoke("healthStatus", {})).data,
  });

  const providers = status?.providers || [];

  const sync = async (provider) => {
    setBusy(provider);
    setNote("");
    const res = await base44.functions.invoke("healthSync", { provider });
    const result = res.data || {};
    if (result.error) setNote(result.error);
    else if (result.connected === false) setNote("Reconnect to start syncing again.");
    else setNote("Synced just now");
    queryClient.invalidateQueries({ queryKey: ["healthSnapshots"] });
    queryClient.invalidateQueries({ queryKey: ["healthStatus"] });
    setBusy(null);
  };

  const connect = async (provider) => {
    setBusy(provider);
    setNote("");
    const res = await base44.functions.invoke("healthStart", { provider });
    if (res.data?.url) window.location.href = res.data.url;
    else {
      setNote(res.data?.error || "That wearable isn't set up yet.");
      setBusy(null);
    }
  };

  // Coming back from a consent screen: pull the fresh data, then tidy the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("health");
    if (!result) return;
    const provider = params.get("provider") || "oura";
    const label = providers.find((p) => p.provider === provider)?.label || "Wearable";
    const reason = params.get("reason");
    window.history.replaceState({}, "", window.location.pathname);
    if (result === "connected") sync(provider);
    else if (result === "denied") setNote(`${label} connection was cancelled.`);
    else setNote(reason ? `Couldn't connect ${label} — ${reason}` : `Couldn't connect ${label}. Please try again.`);
  }, []);

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E8E4DF] mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Moon className="w-4 h-4 text-[#5C8D89]" />
        <p className="font-semibold text-[#1A1A1A] text-sm">Sleep &amp; activity</p>
      </div>
      <p className="text-xs text-[#8A8580] mb-4">
        Connect a ring or watch and your sleep, readiness and activity land here every morning — and shape what your partner suggests.
      </p>

      <div className="space-y-2">
        {providers.map((p) => {
          const Icon = ICONS[p.provider] || Watch;
          const working = busy === p.provider;
          return (
            <div key={p.provider} className="rounded-xl border border-[#E8E4DF] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 text-[#5C8D89] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] leading-tight">{p.label}</p>
                    <p className="text-[10px] text-[#8A8580] truncate">
                      {p.connected
                        ? p.lastSyncedAt
                          ? `Synced ${format(new Date(p.lastSyncedAt), "MMM d, h:mm a")}`
                          : "Connected — no data yet"
                        : p.configured
                        ? "Not connected"
                        : "Setup needed"}
                    </p>
                  </div>
                </div>

                {p.connected ? (
                  <button
                    onClick={() => sync(p.provider)}
                    disabled={!!busy}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#1A1A1A] text-white text-xs font-medium hover:bg-[#333] transition-colors disabled:opacity-60 flex-shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${working ? "animate-spin" : ""}`} />
                    {working ? "Syncing" : "Sync"}
                  </button>
                ) : (
                  <button
                    onClick={() => connect(p.provider)}
                    disabled={!!busy || !p.configured}
                    className="px-3 h-8 rounded-lg border border-[#1A1A1A] text-[#1A1A1A] text-xs font-medium hover:bg-[#F5F0EB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {working ? "Opening…" : "Connect"}
                  </button>
                )}
              </div>
              {p.lastError && <p className="text-[10px] text-[#B0AAA4] mt-1">{p.lastError}</p>}
            </div>
          );
        })}
      </div>

      {note && <p className="text-[11px] text-[#8A8580] mt-2">{note}</p>}
    </div>
  );
}