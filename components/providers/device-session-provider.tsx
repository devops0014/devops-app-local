"use client";

import { useCallback, useEffect, useState } from "react";
import { Laptop, LogOut, ShieldAlert, Smartphone } from "lucide-react";
import { describeDevice } from "@/lib/device";
import { supabase } from "@/lib/supabase/client";

type SessionRow = { id: string; device_name: string; browser: string; os: string; device_fingerprint: string; last_active: string };

export function DeviceSessionProvider({ children }: { children: React.ReactNode }) {
  const [blockedSessions, setBlockedSessions] = useState<SessionRow[] | null>(null);
  const [currentFingerprint, setCurrentFingerprint] = useState("");
  const [busy, setBusy] = useState(false);

  const register = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const device = await describeDevice();
    setCurrentFingerprint(device.fingerprint);
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify(device),
    });
    const payload = await response.json() as { sessions?: SessionRow[]; sessionId?: string };
    if (response.ok && payload.sessionId) window.sessionStorage.setItem("devopscrack-session-id", payload.sessionId);
    setBlockedSessions(response.status === 409 ? payload.sessions ?? [] : null);
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void register(), 0);
    const heartbeat = window.setInterval(() => void register(), 60 * 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(heartbeat);
    };
  }, [register]);

  const revoke = async (id: string) => {
    if (!supabase) return;
    setBusy(true);
    const { data } = await supabase.auth.getSession();
    await fetch(`/api/sessions/${id}`, { method: "DELETE", headers: { authorization: `Bearer ${data.session?.access_token ?? ""}` } });
    await register();
    setBusy(false);
  };

  const revokeAllAndContinue = async () => {
    if (!supabase) return;
    setBusy(true);
    const { data } = await supabase.auth.getSession();
    await fetch("/api/sessions", { method: "DELETE", headers: { authorization: `Bearer ${data.session?.access_token ?? ""}` } });
    await register();
    setBusy(false);
  };

  return <>
    {children}
    {blockedSessions && (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-lg">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#111113] p-6 shadow-2xl">
          <span className="grid size-12 place-items-center rounded-2xl bg-amber-400/10 text-amber-300"><ShieldAlert size={22} /></span>
          <h2 className="mt-5 text-xl font-semibold">Maximum devices reached</h2>
          <p className="mt-2 text-xs leading-6 text-zinc-500">Your subscription supports two active devices. Sign out one device to continue securely.</p>
          <div className="mt-5 space-y-2">
            {blockedSessions.map((session) => {
              const mobile = /iPhone|iPad|Android/i.test(`${session.device_name} ${session.os}`);
              return <div key={session.id} className="flex items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.025] p-4">
                <span className="grid size-10 place-items-center rounded-xl bg-white/[.04] text-zinc-400">{mobile ? <Smartphone size={18} /> : <Laptop size={18} />}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{session.device_name}</p><p className="mt-1 text-[10px] text-zinc-600">{session.browser} · {session.os} · {new Date(session.last_active).toLocaleString()}</p>{session.device_fingerprint === currentFingerprint && <span className="mt-1 inline-block text-[9px] text-emerald-300">Current device</span>}</div>
                <button disabled={busy} onClick={() => revoke(session.id)} className="flex h-9 items-center gap-2 rounded-xl border border-rose-400/15 px-3 text-[10px] text-rose-300 hover:bg-rose-400/[.06]"><LogOut size={13} /> Sign out</button>
              </div>;
            })}
          </div>
          <button disabled={busy} onClick={revokeAllAndContinue} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-[10px] text-zinc-300 hover:bg-white/[.05]"><LogOut size={13} /> Sign out all devices and continue</button>
        </div>
      </div>
    )}
  </>;
}
