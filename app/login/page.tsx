"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Phone, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { Badge, Button } from "@/components/ui";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    if (supabase) {
      if (mode === "signup") {
        const name = String(formData.get("name") ?? "");
        const mobile = String(formData.get("mobile") ?? "").trim();
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, full_name: name, mobile, phone: mobile },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }
        if (!data.session) {
          setNotice("Check your inbox to verify your email, then sign in.");
          setMode("login");
          setLoading(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }
      }
      window.sessionStorage.removeItem("devopscrack-welcome-shown");
      router.push("/dashboard");
      return;
    }

    if (mode === "signup") {
      setNotice("Demo account created. Opening your command centre…");
    }
    window.setTimeout(() => router.push("/dashboard"), 650);
  };

  const switchMode = (nextMode: "login" | "signup") => {
    setMode(nextMode);
    setError("");
    setNotice("");
  };

  const googleLogin = async () => {
    if (!supabase) {
      router.push("/dashboard");
      return;
    }
    setError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (oauthError) setError(oauthError.message);
  };

  const title = mode === "login" ? "Welcome back" : "Create your account";
  const subtitle = mode === "login"
    ? "Sign in to continue your interview preparation."
    : "Start your personalized DevOps interview roadmap.";

  return (
    <main className="grid min-h-screen bg-[#09090b] text-white lg:grid-cols-2">
      <section className="relative hidden overflow-hidden border-r border-white/[.06] lg:flex lg:flex-col lg:p-10">
        <div className="premium-grid absolute inset-0 opacity-65" />
        <div className="absolute left-[-180px] top-[-120px] size-[520px] rounded-full bg-violet-600/18 blur-[120px]" />
        <div className="absolute bottom-[-180px] right-[-160px] size-[480px] rounded-full bg-cyan-500/10 blur-[110px]" />
        <div className="relative"><Brand /></div>
        <div className="relative my-auto max-w-lg">
          <Badge tone="violet"><Sparkles size={11} className="mr-1" /> Interview confidence, engineered</Badge>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.08] tracking-[-.055em]">Your next offer starts with today’s practice.</h1>
          <p className="mt-5 text-sm leading-7 text-zinc-500">Join 10,000+ learners mastering DevOps interviews through structured questions, adaptive practice, and real performance data.</p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[["1,857+", "Questions"], ["89%", "Success rate"], ["4.9/5", "Rating"]].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-[9px] text-zinc-600">{label}</p></div>
            ))}
          </div>
        </div>
        <p className="relative text-[9px] text-zinc-700">© 2026 DevOpsCrack</p>
      </section>

      <section className="flex min-h-screen flex-col p-5 sm:p-8 lg:p-12">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="lg:hidden"><Brand /></div>
          <Link href="/" className="flex items-center gap-2 text-[10px] text-zinc-600 hover:text-white"><ArrowLeft size={13} /> Home</Link>
        </div>
        <div className="mx-auto my-auto w-full max-w-md py-10">
          <div className="mb-7 grid grid-cols-2 rounded-xl border border-white/[.07] bg-white/[.025] p-1">
            <button onClick={() => switchMode("login")} className={`h-9 rounded-lg text-[11px] font-medium transition ${mode === "login" ? "bg-white/[.08] text-white shadow-lg" : "text-zinc-600 hover:text-zinc-300"}`}>Sign in</button>
            <button onClick={() => switchMode("signup")} className={`h-9 rounded-lg text-[11px] font-medium transition ${mode === "signup" ? "bg-white/[.08] text-white shadow-lg" : "text-zinc-600 hover:text-zinc-300"}`}>Create account</button>
          </div>
          <h2 className="text-3xl font-semibold tracking-[-.045em]">{title}</h2>
          <p className="mt-2 text-xs text-zinc-600">{subtitle}</p>
          <button onClick={googleLogin} className="mt-7 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-white/[.09] bg-white/[.035] text-xs font-medium text-zinc-200 hover:bg-white/[.06]">
            <span className="grid size-5 place-items-center rounded-full bg-white text-[10px] font-bold text-[#4285F4]">G</span>
            Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-white/[.07]" /><span className="text-[9px] uppercase tracking-wider text-zinc-700">or email</span><span className="h-px flex-1 bg-white/[.07]" /></div>
          <form onSubmit={submitAuth} className="space-y-4">
            {mode === "signup" && (
              <label className="block">
                <span className="mb-2 block text-[10px] font-medium text-zinc-500">Full name</span>
                <span className="auth-field">
                  <UserRound size={17} />
                  <input name="name" type="text" required autoComplete="name" placeholder="Your full name" />
                </span>
              </label>
            )}
            {mode === "signup" && (
              <label className="block">
                <span className="mb-2 block text-[10px] font-medium text-zinc-500">Mobile number</span>
                <span className="auth-field">
                  <Phone size={17} />
                  <input name="mobile" type="tel" required autoComplete="tel" inputMode="tel" pattern="[+]?[0-9 ()-]{8,18}" placeholder="+91 98765 43210" />
                </span>
              </label>
            )}
            <label className="block">
              <span className="mb-2 block text-[10px] font-medium text-zinc-500">Email address</span>
              <span className="auth-field">
                <Mail size={17} />
                <input name="email" type="email" autoComplete="email" placeholder="name@example.com" defaultValue={isSupabaseConfigured ? "" : "demo@devopscrack.com"} required />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 flex justify-between text-[10px] font-medium text-zinc-500">
                <span>Password</span>
                {mode === "login" && <Link href="/forgot-password" className="text-violet-400">Forgot password?</Link>}
              </span>
              <span className="auth-field">
                <LockKeyhole size={17} />
                <input name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Minimum 8 characters" minLength={8} defaultValue={isSupabaseConfigured ? "" : "demo12345"} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-zinc-700 hover:text-zinc-400">{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </span>
            </label>
            {error && <p className="rounded-xl border border-rose-400/15 bg-rose-400/[.06] px-3 py-2.5 text-[10px] text-rose-300">{error}</p>}
            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
              {!loading && <ArrowRight size={15} />}
            </Button>
          </form>
          <p className="mt-6 text-center text-[10px] text-zinc-600">
            {mode === "login" ? "New to DevOpsCrack?" : "Already have an account?"}{" "}
            <button onClick={() => switchMode(mode === "login" ? "signup" : "login")} className="font-medium text-violet-400">
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
          <div className="mt-7 flex items-center justify-center gap-2 text-[9px] text-zinc-700"><ShieldCheck size={12} className="text-emerald-400" /> Protected by secure, encrypted authentication</div>
        </div>
      </section>
      {notice && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="verification-title">
          <div className="relative w-full max-w-lg rounded-[28px] border border-emerald-400/20 bg-[#111315] p-7 text-center shadow-[0_40px_130px_rgba(0,0,0,.65)] sm:p-10">
            <button onClick={() => setNotice("")} className="absolute right-4 top-4 grid size-9 place-items-center rounded-xl text-zinc-500 hover:bg-white/[.06]" aria-label="Close"><X size={18} /></button>
            <span className="mx-auto grid size-16 place-items-center rounded-[22px] border border-emerald-400/20 bg-emerald-400/[.08] text-emerald-300 shadow-[0_0_50px_rgba(52,211,153,.12)]"><CheckCircle2 size={30} /></span>
            <h2 id="verification-title" className="mt-6 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Verify your email</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-zinc-400">{notice}</p>
            <button onClick={() => setNotice("")} className="mt-7 h-12 w-full rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-sm font-semibold text-white">Return to sign in</button>
          </div>
        </div>
      )}
    </main>
  );
}
