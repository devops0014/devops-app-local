"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Bell, CheckCircle2, Laptop, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Notification = { id: string; event_type: string; payload: Record<string, string>; created_at: string };

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !supabase) return;
    void supabase.from("security_notifications").select("id,event_type,payload,created_at").order("created_at", { ascending: false }).limit(12)
      .then(({ data, error: queryError }) => {
        setItems((data as Notification[] | null) ?? []);
        setError(queryError?.message ?? "");
        setLoading(false);
      });
  }, [open]);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (next) { setLoading(true); setError(""); }
  };

  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <Dialog.Trigger asChild><button className="relative grid size-9 place-items-center rounded-xl text-zinc-500 hover:bg-white/[.06] hover:text-zinc-200" aria-label="Open notifications"><Bell size={17} />{items.length > 0 && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-violet-400" />}</button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/45" />
      <Dialog.Content className="fixed right-3 top-20 z-[90] w-[calc(100%-24px)] max-w-sm rounded-2xl border border-white/10 bg-[var(--panel)] p-4 shadow-[0_28px_90px_rgba(0,0,0,.5)] sm:right-6">
        <div className="flex items-center justify-between"><div><Dialog.Title className="text-sm font-semibold">Notifications</Dialog.Title><Dialog.Description className="mt-1 text-[10px] text-zinc-600">Security and account activity</Dialog.Description></div><Dialog.Close className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/[.06]"><X size={16} /></Dialog.Close></div>
        <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
          {loading ? <div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-violet-400" /></div> : error ? <div className="grid min-h-52 place-items-center px-5 text-center"><div><ShieldCheck size={28} className="mx-auto text-rose-400" /><p className="mt-3 text-xs font-medium">Notifications need setup</p><p className="mt-1 text-[10px] leading-5 text-zinc-500">{error}</p></div></div> : items.length ? items.map((item) => <div key={item.id} className="flex gap-3 rounded-xl border border-white/[.07] bg-white/[.025] p-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cyan-400/[.08] text-cyan-300">{item.event_type.includes("login") ? <Laptop size={16} /> : <ShieldCheck size={16} />}</span><div><p className="text-[11px] font-medium">{notificationTitle(item.event_type)}</p><p className="mt-1 text-[9px] leading-4 text-zinc-600">{item.payload.device_name ?? item.payload.browser ?? "Your account security status changed."}</p><p className="mt-1 text-[8px] text-zinc-700">{new Date(item.created_at).toLocaleString()}</p></div></div>) : <div className="grid min-h-52 place-items-center text-center"><div><CheckCircle2 size={28} className="mx-auto text-emerald-400" /><p className="mt-3 text-xs font-medium">You’re all caught up</p><p className="mt-1 text-[10px] text-zinc-600">New logins and security updates will appear here.</p></div></div>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function notificationTitle(type: string) {
  if (type.includes("new_device") || type.includes("login")) return "New device login";
  if (type.includes("revoked")) return "Device signed out";
  return "Account security update";
}
