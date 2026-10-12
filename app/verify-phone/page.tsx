"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LoaderCircle, LogOut, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { Badge, Button } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { asRole, isStaff } from "@/lib/rbac";

export default function VerifyPhonePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<"phone" | "code" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const returnTo = () => {
    const value = new URLSearchParams(window.location.search).get("returnTo");
    return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
  };

  useEffect(() => {
    if (!supabase) {
      router.replace("/dashboard");
      return;
    }
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login?returnTo=/verify-phone");
        return;
      }
      const { data: profile } = await supabase.from("profiles")
        .select("role,mobile,phone_verified_at").eq("id", data.session.user.id).maybeSingle();
      if (profile?.phone_verified_at || isStaff(asRole(profile?.role))) {
        router.replace(returnTo());
        return;
      }
      setPhone(profile?.mobile ?? String(data.session.user.user_metadata?.mobile ?? ""));
      setReady(true);
    })();
  }, [router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1_000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const call = async (path: string, body: unknown) => {
    const { data } = await supabase!.auth.getSession();
    const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(String(payload.error ?? "Something went wrong. Please try again."));
    return payload;
  };

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await call("/api/phone/send-otp", { phone, consent });
      setSentTo(String(result.phone));
      setDevCode(result.devCode ? String(result.devCode) : "");
      setResendIn(Number(result.resendIn ?? 60));
      setCode("");
      setStep("code");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await call("/api/phone/verify-otp", { code });
      setStep("done");
      window.setTimeout(() => router.replace(returnTo()), 900);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    router.replace("/login");
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#09090b] p-5 text-white">
      <div className="premium-grid absolute inset-0 opacity-50" />
      <div className="absolute left-1/2 top-[-160px] size-[520px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Brand />
          <button onClick={signOut} className="flex items-center gap-1.5 text-[10px] text-zinc-600 hover:text-white"><LogOut size={12} /> Sign out</button>
        </div>

        <div className="rounded-[26px] border border-white/[.08] bg-[#111214]/90 p-6 shadow-[0_40px_120px_rgba(0,0,0,.5)] backdrop-blur-xl sm:p-8">
          {!ready ? (
            <div className="grid min-h-60 place-items-center"><LoaderCircle className="animate-spin text-violet-400" /></div>
          ) : step === "done" ? (
            <div className="py-8 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-[22px] border border-emerald-400/20 bg-emerald-400/[.08] text-emerald-300"><CheckCircle2 size={30} /></span>
              <h1 className="mt-6 text-2xl font-semibold tracking-[-.04em]">Number verified</h1>
              <p className="mt-2 text-xs text-zinc-500">Opening your workspace…</p>
            </div>
          ) : (
            <>
              <Badge tone="green"><MessageCircle size={11} className="mr-1" /> One-time step</Badge>
              <h1 className="mt-5 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">
                {step === "phone" ? "Verify your WhatsApp number" : "Enter the code"}
              </h1>
              <p className="mt-2 text-xs leading-6 text-zinc-500">
                {step === "phone"
                  ? "We'll send a 6-digit code to your WhatsApp. This keeps the platform free and spam-free."
                  : <>We sent a code on WhatsApp to <span className="font-medium text-zinc-200">{sentTo}</span>.</>}
              </p>

              {step === "phone" ? (
                <form onSubmit={sendCode} className="mt-6 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-medium text-zinc-500">WhatsApp number</span>
                    <span className="auth-field">
                      <Phone size={17} />
                      <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" required autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" />
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3 text-[10px] leading-5 text-zinc-400">
                    <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-violet-500" required />
                    <span>I agree that DevOpsCrack may contact me by phone, WhatsApp and email about my preparation and its DevOps courses. I can opt out at any time.</span>
                  </label>
                  {error && <p className="rounded-xl border border-rose-400/15 bg-rose-400/[.06] px-3 py-2.5 text-[10px] text-rose-300">{error}</p>}
                  <Button type="submit" size="lg" disabled={busy || !consent} className="w-full">
                    {busy ? "Sending…" : "Send code on WhatsApp"} {!busy && <ArrowRight size={15} />}
                  </Button>
                </form>
              ) : (
                <form onSubmit={verifyCode} className="mt-6 space-y-4">
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="••••••"
                    aria-label="6-digit code"
                    className="h-14 w-full rounded-xl border border-white/[.1] bg-white/[.03] text-center font-mono text-2xl tracking-[.6em] text-white outline-none focus:border-violet-400/50"
                  />
                  {devCode && <p className="rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-3 py-2 text-[10px] text-amber-200">Dev mode (WhatsApp not configured): your code is <strong className="font-mono">{devCode}</strong></p>}
                  {error && <p className="rounded-xl border border-rose-400/15 bg-rose-400/[.06] px-3 py-2.5 text-[10px] text-rose-300">{error}</p>}
                  <Button type="submit" size="lg" disabled={busy || code.length !== 6} className="w-full">
                    {busy ? "Verifying…" : "Verify"} {!busy && <ShieldCheck size={15} />}
                  </Button>
                  <div className="flex items-center justify-between text-[10px]">
                    <button type="button" onClick={() => { setStep("phone"); setError(""); }} className="text-zinc-500 hover:text-white">Change number</button>
                    <button type="button" disabled={resendIn > 0 || busy} onClick={() => void sendCode()} className="text-violet-300 disabled:text-zinc-600">
                      {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-[9px] text-zinc-700"><ShieldCheck size={12} className="text-emerald-400" /> Your number is only used by the DevOpsCrack team.</p>
      </div>
    </main>
  );
}
