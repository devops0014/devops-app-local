"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    if (supabase) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }
    }
    setSent(true);
    setLoading(false);
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#09090b] px-5 text-white">
      <div className="premium-grid absolute inset-0 opacity-50" />
      <div className="absolute left-1/2 top-[-240px] size-[600px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[130px]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Brand />
          <Link href="/login" className="flex items-center gap-2 text-[10px] text-zinc-600 hover:text-white"><ArrowLeft size={13} /> Sign in</Link>
        </div>
        <section className="rounded-3xl border border-white/[.08] bg-[#0d0d10]/90 p-6 shadow-[0_32px_100px_rgba(0,0,0,.45)] backdrop-blur-2xl sm:p-8">
          {sent ? (
            <div className="text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"><CheckCircle2 size={25} /></span>
              <h1 className="mt-5 text-2xl font-semibold tracking-[-.04em]">Check your inbox</h1>
              <p className="mt-3 text-xs leading-6 text-zinc-500">If an account exists for that email, we sent a secure password-reset link.</p>
              <Link href="/login" className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-violet-500 px-5 text-xs font-medium">Return to sign in</Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-[-.04em]">Reset your password</h1>
              <p className="mt-2 text-xs leading-5 text-zinc-600">Enter your account email and we’ll send you a secure reset link.</p>
              <form onSubmit={submit} className="mt-7 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-medium text-zinc-500">Email address</span>
                  <span className="flex h-11 items-center gap-3 rounded-xl border border-white/[.08] bg-white/[.025] px-3 focus-within:border-violet-400/30">
                    <Mail size={15} className="text-zinc-700" />
                    <input name="email" type="email" required placeholder="you@company.com" className="min-w-0 flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-700" />
                  </span>
                </label>
                {error && <p className="rounded-xl border border-rose-400/15 bg-rose-400/[.06] px-3 py-2.5 text-[10px] text-rose-300">{error}</p>}
                <Button type="submit" size="lg" disabled={loading} className="w-full">{loading ? "Sending…" : "Send reset link"}</Button>
              </form>
            </>
          )}
        </section>
        <p className="mt-5 flex items-center justify-center gap-2 text-[9px] text-zinc-700"><ShieldCheck size={12} className="text-emerald-400" /> Password links expire automatically for your protection</p>
      </div>
    </main>
  );
}
