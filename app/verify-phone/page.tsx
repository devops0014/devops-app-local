"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, CheckCircle2, Copy, LoaderCircle, LogOut, MessageCircle, Phone, RefreshCw, ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Badge, Button } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { asRole, isStaff } from "@/lib/rbac";
import { attributionForSignup } from "@/lib/attribution";
import { trackMetaEvent } from "@/components/providers/analytics-provider";

type Status = {
  method: "none" | "inbound" | "otp";
  prefill?: string | null;
  verified: boolean;
  businessNumber: string | null;
  devMode: boolean;
  request: { token: string; status: "pending" | "verified" | "failed"; error: string | null; expiresAt: string } | null;
};
type Started = { token: string; message: string; expiresAt: string; businessNumber: string | null; waLink: string | null; devMode: boolean };

async function api<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await supabase!.auth.getSession();
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Something went wrong. Please try again.");
  return payload;
}

function prettyNumber(digits: string | null) {
  if (!digits) return "";
  return digits.startsWith("91") && digits.length === 12 ? `+91 ${digits.slice(2, 7)} ${digits.slice(7)}` : `+${digits}`;
}

export default function VerifyPhonePage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [done, setDone] = useState(false);

  const returnTo = useCallback(() => {
    const value = new URLSearchParams(window.location.search).get("returnTo");
    return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
  }, []);

  const finish = useCallback(() => {
    setDone(true);
    void supabase?.auth.getUser().then(({ data }) => {
      if (data.user) trackMetaEvent("CompleteRegistration", { content_name: "whatsapp_verified" }, `verified-${data.user.id}`);
    });
    const next = returnTo();
    window.setTimeout(() => router.replace(`/welcome?returnTo=${encodeURIComponent(next)}`), 1_000);
  }, [returnTo, router]);

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
        .select("role,phone_verified_at").eq("id", data.session.user.id).maybeSingle();
      if (profile?.phone_verified_at || isStaff(asRole(profile?.role))) {
        router.replace(returnTo());
        return;
      }
      void api("/api/me/attribution", attributionForSignup()).catch(() => undefined);
      try {
        setStatus(await api<Status>("/api/phone/status"));
      } catch {
        setStatus({ method: "none", verified: false, businessNumber: null, devMode: false, request: null });
      }
    })();
  }, [returnTo, router]);

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
          <button onClick={signOut} className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-white"><LogOut size={12} /> Sign out</button>
        </div>
        <div className="rounded-[26px] border border-white/[.08] bg-[#111214]/90 p-6 shadow-[0_40px_120px_rgba(0,0,0,.5)] backdrop-blur-xl sm:p-8">
          {done ? (
            <div className="py-8 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-[22px] border border-emerald-400/20 bg-emerald-400/[.08] text-emerald-300"><CheckCircle2 size={30} /></span>
              <h1 className="mt-6 text-2xl font-semibold tracking-[-.04em]">You&rsquo;re all set</h1>
              <p className="mt-2 text-xs text-zinc-500">Opening your workspace…</p>
            </div>
          ) : !status ? (
            <div className="grid min-h-60 place-items-center"><LoaderCircle className="animate-spin text-violet-400" /></div>
          ) : status.method === "none" ? (
            <ConfirmFlow initialPhone={status.prefill ?? ""} onConfirmed={finish} />
          ) : status.method === "otp" ? (
            <OtpFlow onVerified={finish} />
          ) : (
            <InboundFlow initial={status} onVerified={finish} />
          )}
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-xs text-zinc-700"><ShieldCheck size={12} className="text-emerald-400" /> Your number is only used by the DevOpsCrack team.</p>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------------------
 * Default (no setup): the student confirms their mobile number. No code.
 * ------------------------------------------------------------------------- */
function ConfirmFlow({ initialPhone, onConfirmed }: { initialPhone: string; onConfirmed: () => void }) {
  const [phone, setPhone] = useState(initialPhone.replace(/^\+91/, ""));
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/phone/confirm", { phone, consent });
      onConfirmed();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your number.");
      setBusy(false);
    }
  };

  return (
    <>
      <Badge tone="green"><Phone size={12} className="mr-1" /> One-time step</Badge>
      <h1 className="mt-5 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Confirm your mobile number</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-400">Use your own number. Our team may call to help with your preparation, and accounts with wrong numbers are removed.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-300">Mobile number</span>
          <span className="auth-field">
            <Phone size={17} />
            <span className="text-sm text-zinc-400">+91</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" required autoComplete="tel-national" inputMode="tel" placeholder="98765 43210" aria-label="Mobile number" />
          </span>
          <span className="mt-1.5 block text-xs text-zinc-500">Outside India? Type your number with the country code, e.g. +971…</span>
        </label>
        <ConsentBox checked={consent} onChange={setConsent} />
        {error && <p className="rounded-xl border border-rose-400/15 bg-rose-400/[.06] px-3 py-2.5 text-sm text-rose-300">{error}</p>}
        <Button type="submit" size="lg" disabled={busy || !consent || !phone.trim()} className="w-full">
          {busy ? "Saving…" : "Continue"} {!busy && <ArrowRight size={15} />}
        </Button>
      </form>
    </>
  );
}

function ConsentBox({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3 text-xs leading-5 text-zinc-400">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-violet-500" />
      <span>I agree that DevOpsCrack may contact me by phone, WhatsApp and email about my preparation and its DevOps courses. I can opt out at any time.</span>
    </label>
  );
}

/* ---------------------------------------------------------------------------
 * Default (free): the student sends "VERIFY DC-XXXXXXXX" to our WhatsApp number.
 * ------------------------------------------------------------------------- */
function InboundFlow({ initial, onVerified }: { initial: Status; onVerified: () => void }) {
  const [consent, setConsent] = useState(false);
  const [started, setStarted] = useState<Started | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [simPhone, setSimPhone] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const verifiedRef = useRef(false);

  const start = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setStarted(await api<Started>("/api/phone/start", { consent: true }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start verification.");
    } finally {
      setBusy(false);
    }
  }, []);

  // Prepare the code as soon as consent is given so the WhatsApp button is a
  // plain link (one tap, never blocked as a pop-up).
  useEffect(() => {
    if (consent && !started && !busy && !error) void start();
  }, [busy, consent, error, start, started]);

  // Poll until the webhook marks the account verified.
  useEffect(() => {
    if (!started) return;
    let active = true;
    const tick = async () => {
      try {
        const status = await api<Status>("/api/phone/status");
        if (!active || verifiedRef.current) return;
        if (status.verified) {
          verifiedRef.current = true;
          onVerified();
        } else if (status.request && status.request.token === started.token && status.request.status === "failed") {
          setFailed(status.request.error ?? "Verification failed. Please try again.");
          setStarted(null);
        }
      } catch {
        // Keep polling through brief network errors.
      }
    };
    const onFocus = () => void tick();
    const timer = window.setInterval(tick, 3_000);
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [onVerified, started]);

  useEffect(() => {
    if (!started) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [started]);

  const secondsLeft = started ? Math.max(0, Math.floor((Date.parse(started.expiresAt) - now) / 1_000)) : 0;
  const expired = Boolean(started) && secondsLeft === 0;

  const copy = async () => {
    if (!started) return;
    await navigator.clipboard?.writeText(started.message).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  const simulate = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/phone/dev-verify", { phone: simPhone });
      verifiedRef.current = true;
      onVerified();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Simulation failed.");
    } finally {
      setBusy(false);
    }
  };

  const number = prettyNumber(started?.businessNumber ?? initial.businessNumber);

  return (
    <>
      <Badge tone="green"><MessageCircle size={11} className="mr-1" /> One-time step · takes 10 seconds</Badge>
      <h1 className="mt-5 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Verify with WhatsApp</h1>
      <p className="mt-2 text-xs leading-6 text-zinc-500">
        Tap the button, then press <strong className="text-zinc-300">Send</strong> in WhatsApp. That's it — we'll unlock your free account the moment your message arrives.
      </p>

      <div className="mt-6 space-y-4">
        <ConsentBox checked={consent} onChange={(value) => { setConsent(value); if (!value) setStarted(null); setError(""); setFailed(null); }} />

        {failed && <p className="rounded-xl border border-rose-400/15 bg-rose-400/[.06] px-3 py-2.5 text-xs text-rose-300">{failed}</p>}
        {error && <p className="rounded-xl border border-rose-400/15 bg-rose-400/[.06] px-3 py-2.5 text-xs text-rose-300">{error}</p>}

        {started && !expired && started.waLink ? (
          <a href={started.waLink} target="_blank" rel="noreferrer" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-black shadow-[0_14px_40px_rgba(37,211,102,.25)] transition hover:brightness-105">
            <MessageCircle size={17} /> Verify on WhatsApp <ArrowRight size={15} />
          </a>
        ) : (
          <Button size="lg" className="w-full" disabled={!consent || busy || (Boolean(started) && !expired && !started?.devMode)} onClick={() => void start()}>
            {busy ? <><LoaderCircle size={15} className="animate-spin" /> Preparing…</> : expired || failed ? <><RefreshCw size={15} /> Get a new code</> : <><MessageCircle size={16} /> Verify on WhatsApp</>}
          </Button>
        )}

        {started && !expired && (
          <div className="rounded-xl border border-white/[.07] bg-black/25 p-4">
            <p className="text-xs text-zinc-500">On a computer, or if WhatsApp didn't open, send this message{number ? <> to <span className="font-medium text-zinc-200">{number}</span></> : null}:</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-white/[.08] bg-white/[.03] px-3 py-2 font-mono text-sm tracking-wide text-emerald-200">{started.message}</code>
              <button onClick={() => void copy()} className="grid size-9 place-items-center rounded-lg border border-white/[.08] text-zinc-400 hover:text-white" aria-label="Copy message"><Copy size={14} /></button>
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <LoaderCircle size={12} className="animate-spin text-emerald-400" />
              {copied ? "Copied!" : `Waiting for your message… code valid for ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`}
            </p>
          </div>
        )}

        {started?.devMode && !expired && (
          <form onSubmit={simulate} className="rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-3">
            <p className="text-xs text-amber-200">Dev mode (webhook not configured): simulate the WhatsApp message.</p>
            <div className="mt-2 flex gap-2">
              <input value={simPhone} onChange={(event) => setSimPhone(event.target.value)} placeholder="+91 98765 43210" className="h-9 min-w-0 flex-1 rounded-lg border border-white/[.1] bg-black/30 px-3 text-xs" />
              <Button size="sm" type="submit" disabled={busy || !simPhone}>Simulate</Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Fallback (PHONE_VERIFY_METHOD=otp, billed by Meta): we send a 6-digit code.
 * ------------------------------------------------------------------------- */
function OtpFlow({ onVerified }: { onVerified: () => void }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1_000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ phone: string; resendIn?: number; devCode?: string }>("/api/phone/send-otp", { phone, consent });
      setSentTo(result.phone);
      setDevCode(result.devCode ?? "");
      setResendIn(result.resendIn ?? 60);
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
      await api("/api/phone/verify-otp", { code });
      onVerified();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Badge tone="green"><MessageCircle size={11} className="mr-1" /> One-time step</Badge>
      <h1 className="mt-5 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">{step === "phone" ? "Verify your WhatsApp number" : "Enter the code"}</h1>
      <p className="mt-2 text-xs leading-6 text-zinc-500">
        {step === "phone" ? "We'll send a 6-digit code to your WhatsApp." : <>We sent a code on WhatsApp to <span className="font-medium text-zinc-200">{sentTo}</span>.</>}
      </p>
      {step === "phone" ? (
        <form onSubmit={sendCode} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-zinc-500">WhatsApp number</span>
            <span className="auth-field"><Phone size={17} /><input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" required autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" /></span>
          </label>
          <ConsentBox checked={consent} onChange={setConsent} />
          {error && <p className="rounded-xl border border-rose-400/15 bg-rose-400/[.06] px-3 py-2.5 text-xs text-rose-300">{error}</p>}
          <Button type="submit" size="lg" disabled={busy || !consent} className="w-full">{busy ? "Sending…" : "Send code on WhatsApp"} {!busy && <ArrowRight size={15} />}</Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-6 space-y-4">
          <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="••••••" aria-label="6-digit code" className="h-14 w-full rounded-xl border border-white/[.1] bg-white/[.03] text-center font-mono text-2xl tracking-[.6em] text-white outline-none focus:border-violet-400/50" />
          {devCode && <p className="rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-3 py-2 text-xs text-amber-200">Dev mode: your code is <strong className="font-mono">{devCode}</strong></p>}
          {error && <p className="rounded-xl border border-rose-400/15 bg-rose-400/[.06] px-3 py-2.5 text-xs text-rose-300">{error}</p>}
          <Button type="submit" size="lg" disabled={busy || code.length !== 6} className="w-full">{busy ? "Verifying…" : "Verify"} {!busy && <ShieldCheck size={15} />}</Button>
          <div className="flex items-center justify-between text-xs">
            <button type="button" onClick={() => { setStep("phone"); setError(""); }} className="text-zinc-500 hover:text-white">Change number</button>
            <button type="button" disabled={resendIn > 0 || busy} onClick={() => void sendCode()} className="text-violet-300 disabled:text-zinc-600">{resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}</button>
          </div>
        </form>
      )}
    </>
  );
}
