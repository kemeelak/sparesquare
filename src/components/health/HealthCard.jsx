import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronRight, Moon, Plus, RefreshCw, Watch, X } from "lucide-react";

const ICONS = { oura: Moon, fitbit: Watch };
const DESCRIPTIONS = {
  oura: "Ring — sleep, readiness & activity",
  fitbit: "Watch — sleep, steps & heart rate",
};

export default function HealthCard() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState("");
  const [picking, setPicking] = useState(false);

  const { data: status } = useQuery({
    queryKey: ["healthStatus"],
    queryFn: async () => (await base44.functions.invoke("healthStatus", {})).data,
  });

  const providers = status?.providers || [];
  const connected = providers.filter((p) => p.connected);
  const available = providers.filter((p) => !p.connected);

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
    if (result === "pending") {
      // The consent screen just finished; finish the link here, signed in as this member.
      const ticket = params.get("ticket");
      if (!ticket) {
        setNote(`Couldn't connect ${label}. Please try again.`);
        return;
      }
      setBusy(provider);
      base44.functions
        .invoke("healthFinish", { ticket })
        .then((res) => {
          if (res.data?.connected) sync(provider);
          else setNote(res.data?.error || `Couldn't connect ${label}. Please try again.`);
        })
        .catch((e) => setNote(e?.response?.data?.error || `Couldn't connect ${label}. Please try again.`))
        .finally(() => setBusy(null));
      return;
    }
    if (result === "connected") sync(provider);
    else if (result === "denied") setNote(`${label} connection was cancelled.`);
    else setNote(reason ? `Couldn't connect ${label} — ${reason}` : `Couldn't connect ${label}. Please try again.`);
  }, []);

  // Nothing expands until the user asks to set something up.
  const showOptions = picking;

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E8E4DF] mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Moon className="w-4 h-4 text-[#4A5568]" />
        <p className="font-semibold text-[#1A1A1A] text-sm">Sleep &amp; activity</p>
      </div>
      <p className="text-xs text-[#8A8580] mb-4">
        Connect a ring or watch and your sleep, readiness and activity land here every morning — and shape what your partner suggests.
      </p>

      {/* Connected devices */}
      {connected.map((p) => {
        const Icon = ICONS[p.provider] || Watch;
        const working = busy === p.provider;
        return (
          <div key={p.provider} className="rounded-xl border border-[#E8E4DF] px-3 py-2.5 mb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="w-4 h-4 text-[#4A5568] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] leading-tight">{p.label}</p>
                  <p className="text-[10px] text-[#8A8580] truncate">
                    {p.lastSyncedAt
                      ? `Synced ${format(new Date(p.lastSyncedAt), "MMM d, h:mm a")}`
                      : "Connected — no data yet"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => sync(p.provider)}
                disabled={!!busy}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#1A1A1A] text-white text-xs font-medium hover:bg-[#333] transition-colors disabled:opacity-60 flex-shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${working ? "animate-spin" : ""}`} />
                {working ? "Syncing" : "Sync"}
              </button>
            </div>
            {p.lastError && <p className="text-[10px] text-[#B0AAA4] mt-1">{p.lastError}</p>}
          </div>
        );
      })}

      {/* Step 1 — one obvious way in */}
      {!picking && available.length > 0 && (
        <button
          onClick={() => setPicking(true)}
          className={
            connected.length === 0
              ? "w-full flex items-center justify-center gap-1.5 h-10 rounded-xl bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333] transition-colors"
              : "w-full flex items-center justify-center gap-1.5 h-9 rounded-xl border border-dashed border-[#D9D3CC] text-[#8A8580] text-xs font-medium hover:bg-[#F5F0EB] hover:text-[#1A1A1A] transition-colors"
          }
        >
          <Plus className="w-3.5 h-3.5" />
          {connected.length === 0 ? "Set up a device" : "Add another device"}
        </button>
      )}

      {/* Step 2 — the choices */}
      {showOptions && (
        <div>
          {picking && (
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#B0AAA4]">Choose a device</p>
              <button onClick={() => setPicking(false)} className="p-1 rounded-lg hover:bg-[#F5F0EB]">
                <X className="w-3.5 h-3.5 text-[#8A8580]" />
              </button>
            </div>
          )}

          <div className="space-y-2">
            {available.map((p) => {
              const Icon = ICONS[p.provider] || Watch;
              const working = busy === p.provider;
              return (
                <button
                  key={p.provider}
                  onClick={() => connect(p.provider)}
                  disabled={!!busy || !p.configured}
                  className="w-full flex items-center justify-between gap-2 rounded-xl border border-[#E8E4DF] px-3 py-2.5 text-left hover:border-[#1A1A1A] hover:bg-[#FAF8F5] transition-colors disabled:opacity-50 disabled:hover:border-[#E8E4DF] disabled:hover:bg-transparent"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Icon className="w-4 h-4 text-[#4A5568] flex-shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[#1A1A1A] leading-tight">
                        {p.label}
                        {!p.configured && <span className="text-[10px] text-[#B0AAA4] font-normal"> · setup needed</span>}
                      </span>
                      <span className="block text-[10px] text-[#8A8580] truncate">
                        {p.configured ? DESCRIPTIONS[p.provider] : "Keys not added yet"}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-[#1A1A1A] flex-shrink-0">
                    {working ? "Opening…" : p.configured ? "Connect" : ""}
                    {p.configured && <ChevronRight className="w-3.5 h-3.5 text-[#B0AAA4]" />}
                  </span>
                </button>
              );
            })}
          </div>

          {available.length === 0 && (
            <p className="text-[11px] text-[#8A8580] text-center py-2">Every supported device is connected.</p>
          )}
        </div>
      )}

      {note && <p className="text-[11px] text-[#8A8580] mt-2">{note}</p>}
    </div>
  );
}