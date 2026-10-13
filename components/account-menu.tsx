"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, KeyRound, LogOut, Mail, Phone, UserRound, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { roleLabels } from "@/lib/rbac";
import type { CurrentUserProfile } from "@/lib/hooks/use-current-user";
import { Button } from "@/components/ui";

export function AccountMenu({ profile, onUpdated, onSignOut }: { profile: CurrentUserProfile | null; onUpdated: () => Promise<void>; onSignOut: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const initials = (profile?.name ?? "Student").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !profile) return;
    setSaving(true);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    await Promise.all([
      supabase.from("profiles").update({ name, updated_at: new Date().toISOString() }).eq("id", profile.id),
      supabase.auth.updateUser({ data: { name, full_name: name } }),
    ]);
    await onUpdated();
    setSaving(false);
    setSaved(true);
  };

  const signOut = async () => {
    setOpen(false);
    await onSignOut();
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-white/[.04]" aria-label="Open account settings">
          <span className="grid size-8 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 text-xs font-semibold text-white">
            {profile?.avatar ? <img src={profile.avatar} alt="" className="size-full object-cover" /> : initials}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block max-w-32 truncate text-[11px] font-medium leading-none">{profile?.name ?? "Loading…"}</span>
            <span className="mt-1 block text-xs text-zinc-600">{roleLabels[profile?.role ?? "student"]}</span>
          </span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md" />
        <Dialog.Content className="account-dialog fixed left-1/2 top-1/2 z-[90] w-[calc(100%-24px)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-[26px] border border-white/10 bg-[var(--panel)] p-6 shadow-[0_35px_120px_rgba(0,0,0,.55)] sm:p-8">
          <div className="flex items-start justify-between">
            <div><Dialog.Title className="text-2xl font-semibold tracking-[-.04em]">Account settings</Dialog.Title><Dialog.Description className="mt-2 text-xs text-zinc-500">Manage your personal information and account security.</Dialog.Description></div>
            <Dialog.Close className="grid size-9 place-items-center rounded-xl text-zinc-500 hover:bg-white/[.06]"><X size={18} /></Dialog.Close>
          </div>
          <form onSubmit={save} className="mt-7 space-y-4">
            <AccountField icon={UserRound} label="Full name" name="name" defaultValue={profile?.name ?? ""} />
            <AccountField icon={Phone} label={profile?.phoneVerified ? "WhatsApp number · verified" : "WhatsApp number"} name="mobile" defaultValue={profile?.mobile ?? ""} disabled />
            <AccountField icon={Mail} label="Email address" name="email" defaultValue={profile?.email ?? ""} disabled />
            {saved && <p className="flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[.06] p-3 text-xs text-emerald-300"><CheckCircle2 size={15} /> Profile updated successfully.</p>}
            <div className="flex flex-col gap-2 border-t border-white/[.07] pt-5 sm:flex-row">
              <Button type="submit" disabled={saving} className="sm:flex-1">{saving ? "Saving…" : "Save changes"}</Button>
              <Link href="/change-password" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[.09] px-4 text-xs text-zinc-300"><KeyRound size={14} /> Update password</Link>
            </div>
          </form>
          {profile?.role === "student" && <ContactPreference />}
          <button onClick={signOut} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/15 bg-rose-400/[.05] px-4 py-3 text-xs text-rose-300"><LogOut size={14} /> Sign out securely</button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AccountField({ icon: Icon, label, ...props }: { icon: typeof UserRound; label: string; name: string; defaultValue: string; placeholder?: string; disabled?: boolean }) {
  return <label className="block"><span className="mb-2 block text-xs font-medium text-zinc-500">{label}</span><span className="flex min-h-12 items-center gap-3 rounded-xl border border-white/[.09] bg-white/[.03] px-4 focus-within:border-violet-400/40"><Icon size={16} className="text-zinc-600" /><input {...props} className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none disabled:cursor-not-allowed disabled:opacity-50" /></span></label>;
}

function ContactPreference() {
  const [consent, setConsent] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const request = async (method: "GET" | "POST", body?: unknown) => {
    const { data } = await supabase!.auth.getSession();
    const response = await fetch("/api/me/consent", {
      method,
      headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({})) as { consent?: boolean };
    return Boolean(payload.consent);
  };

  useEffect(() => {
    if (!supabase) return;
    void request("GET").then(setConsent).catch(() => setConsent(null));
  }, []);

  if (consent === null) return null;

  const toggle = async () => {
    setBusy(true);
    try { setConsent(await request("POST", { consent: !consent })); } finally { setBusy(false); }
  };

  return (
    <div className="mt-5 flex items-start justify-between gap-4 rounded-xl border border-white/[.08] bg-white/[.02] p-4">
      <div>
        <p className="text-sm font-medium text-zinc-200">Course updates &amp; calls</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          {consent ? "Our team may contact you about your preparation and courses." : "You won't be contacted by our team."}{" "}
          <Link href="/privacy" className="text-violet-300">Privacy policy</Link>
        </p>
      </div>
      <button type="button" role="switch" aria-checked={consent} disabled={busy} onClick={() => void toggle()} className={`relative h-6 w-11 shrink-0 rounded-full transition ${consent ? "bg-violet-500" : "bg-white/15"} disabled:opacity-60`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${consent ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
