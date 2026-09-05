"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

export default function ChangePasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (newPassword !== confirmation) {
      setError("New password and confirmation do not match.");
      setLoading(false);
      return;
    }

    if (currentPassword === newPassword) {
      setError("Your new password must be different from your current password.");
      setLoading(false);
      return;
    }

    if (!supabase) {
      setError("Password changes require a configured authentication service.");
      setLoading(false);
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (userError || !email) {
      setError("Your session has expired. Please sign in again.");
      setLoading(false);
      return;
    }

    const { error: verificationError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (verificationError) {
      setError("Current password is incorrect.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    window.sessionStorage.removeItem("devopscrack-welcome-shown");
    window.location.replace("/login");
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#09090b] px-5 py-10 text-white">
      <div className="premium-grid absolute inset-0 opacity-50" />
      <div className="relative w-full max-w-md">
        <div className="mb-7 flex items-center justify-between"><Brand /><Link href="/dashboard" className="flex items-center gap-2 text-[10px] text-zinc-500 hover:text-white"><ArrowLeft size={13} /> Dashboard</Link></div>
        <section className="rounded-3xl border border-white/[.08] bg-[#0d0d10]/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-violet-400/10 text-violet-300"><KeyRound size={21} /></span>
          <h1 className="mt-5 text-2xl font-semibold tracking-[-.04em]">Update your password</h1>
          <p className="mt-2 text-xs leading-6 text-zinc-500">Confirm your current password first. After the update, we’ll sign you out securely so you can log in with the new password.</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <PasswordField name="currentPassword" label="Current password" autoComplete="current-password" visible={showPasswords} />
            <PasswordField name="newPassword" label="New password" autoComplete="new-password" visible={showPasswords} />
            <PasswordField name="confirmation" label="Confirm new password" autoComplete="new-password" visible={showPasswords} />
            <button type="button" onClick={() => setShowPasswords((value) => !value)} className="flex items-center gap-2 text-[10px] text-zinc-500 hover:text-zinc-300">{showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}{showPasswords ? "Hide passwords" : "Show passwords"}</button>
            {error && <p role="alert" className="rounded-xl border border-rose-400/15 bg-rose-400/[.06] px-3 py-2.5 text-[10px] text-rose-300">{error}</p>}
            <Button type="submit" size="lg" disabled={loading} className="w-full">{loading ? "Updating securely…" : <><CheckCircle2 size={14} /> Update password</>}</Button>
          </form>
          <p className="mt-5 flex items-center justify-center gap-2 text-[9px] text-zinc-600"><ShieldCheck size={12} className="text-emerald-400" /> Your password is sent directly to the authentication service</p>
        </section>
      </div>
    </main>
  );
}

function PasswordField({ name, label, autoComplete, visible }: { name: string; label: string; autoComplete: string; visible: boolean }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-medium text-zinc-500">{label}</span><input name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={8} required className="h-12 w-full rounded-xl border border-white/[.09] bg-white/[.03] px-4 text-sm text-zinc-200 outline-none transition focus:border-violet-400/40" /></label>;
}
