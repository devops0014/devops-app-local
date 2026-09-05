"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    if (password !== confirmation) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (supabase) {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
      await supabase.auth.signOut({ scope: "local" });
    }
    window.sessionStorage.removeItem("devopscrack-welcome-shown");
    window.location.replace("/login");
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#09090b] px-5 text-white">
      <div className="premium-grid absolute inset-0 opacity-50" />
      <div className="relative w-full max-w-md">
        <div className="mb-8"><Brand /></div>
        <section className="rounded-3xl border border-white/[.08] bg-[#0d0d10]/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-violet-400/10 text-violet-300"><LockKeyhole size={21} /></span>
          <h1 className="mt-5 text-2xl font-semibold tracking-[-.04em]">Choose a new password</h1>
          <p className="mt-2 text-xs text-zinc-600">Use at least eight characters and avoid a password used elsewhere.</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            {["password", "confirmation"].map((name, index) => (
              <label key={name} className="block">
                <span className="mb-2 block text-[10px] font-medium text-zinc-500">{index === 0 ? "New password" : "Confirm password"}</span>
                <input name={name} type="password" minLength={8} required className="h-11 w-full rounded-xl border border-white/[.08] bg-white/[.025] px-3 text-xs text-zinc-200 focus:border-violet-400/30" />
              </label>
            ))}
            {error && <p className="rounded-xl border border-rose-400/15 bg-rose-400/[.06] px-3 py-2.5 text-[10px] text-rose-300">{error}</p>}
            <Button type="submit" size="lg" disabled={loading} className="w-full">{loading ? "Updating…" : <><CheckCircle2 size={14} /> Update password</>}</Button>
          </form>
        </section>
      </div>
    </main>
  );
}
