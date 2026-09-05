"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Crown, ShieldCheck, Sparkles, Star, WalletCards, X, Zap } from "lucide-react";
import { Brand } from "@/components/brand";
import { Badge, Card } from "@/components/ui";
import { createCheckout, plans, type PlanDefinition } from "@/lib/payments";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export default function PricingPage() {
  const [selected, setSelected] = useState<PlanDefinition | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = async () => {
    if (!selected || !supabase || !isSupabaseConfigured) return;
    setProcessing(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.assign(`/login?returnTo=${encodeURIComponent("/pricing")}`);
        return;
      }
      const result = await createCheckout(selected.id, data.session.access_token);
      await loadRazorpay();
      const razorpay = new window.Razorpay({
        key: result.keyId,
        amount: result.amount,
        currency: result.currency,
        name: result.name,
        description: result.description,
        subscription_id: result.subscriptionId,
        prefill: result.prefill,
        theme: { color: "#8b5cf6" },
        modal: { ondismiss: () => setProcessing(false) },
        handler: async (response) => {
          const verification = await fetch("/api/payments/verify-razorpay", {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${data.session!.access_token}` },
            body: JSON.stringify({ ...response, planId: selected.id }),
          });
          const payload = (await verification.json()) as { error?: string; redirectTo?: string };
          if (!verification.ok) throw new Error(payload.error ?? "Payment verification failed.");
          window.location.assign(payload.redirectTo ?? "/dashboard?checkout=success");
        },
      });
      razorpay.on("payment.failed", (event) => {
        setError(event.error?.description
          ? `Razorpay test payment failed: ${event.error.description}`
          : "Payment failed. Test mode is supported; verify the test card, OTP and Razorpay dashboard failure reason.");
        setProcessing(false);
      });
      razorpay.open();
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to start checkout.");
      setProcessing(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09090b] text-white">
      <div className="premium-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-[-260px] h-[650px] w-[900px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[130px]" />
      <nav className="relative z-10 mx-auto flex h-20 max-w-7xl items-center px-5 sm:px-8">
        <Brand />
        <Link href="/" className="ml-auto flex items-center gap-2 text-xs text-zinc-500 transition hover:text-white"><ArrowLeft size={14} /> Home</Link>
      </nav>
      <section className="relative z-[1] mx-auto max-w-7xl px-5 pb-24 pt-14 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="violet"><Sparkles size={11} className="mr-1" /> Razorpay-secured subscriptions</Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-.05em] sm:text-6xl">Pick your interview runway.</h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-zinc-500">One focused plan. Every question, quiz and practice mode included.</p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const featured = plan.id === "half_yearly";
            const Icon = plan.id === "monthly" ? Zap : plan.id === "half_yearly" ? Star : Crown;
            return (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .08 }} whileHover={{ y: -8 }}>
                <Card className={`relative h-full overflow-hidden p-7 backdrop-blur-xl ${featured ? "border-violet-400/35 bg-gradient-to-b from-violet-500/[.13] to-white/[.025] shadow-[0_30px_90px_rgba(124,58,237,.2)]" : "bg-white/[.025]"}`}>
                  <div className="absolute -right-16 -top-16 size-40 rounded-full bg-violet-500/10 blur-3xl" />
                  <div className="flex items-start justify-between">
                    <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[.05] text-violet-300"><Icon size={21} /></span>
                    <span className={`rounded-full px-3 py-1 text-[9px] font-semibold ${featured ? "bg-violet-500 text-white" : "border border-white/10 text-zinc-400"}`}>{plan.badge}</span>
                  </div>
                  <p className="mt-6 text-xs text-zinc-500">{plan.durationLabel}</p>
                  <h2 className="mt-1 text-xl font-semibold">{plan.name}</h2>
                  <div className="mt-5 flex items-end gap-2"><span className="text-5xl font-semibold tracking-[-.05em]">₹{plan.amountInr}</span></div>
                  <p className="mt-2 text-xs text-zinc-500">{plan.id === "monthly" ? "Try it out" : `₹${plan.monthlyEquivalent}/month · Save ${plan.savingsPercent}%`}</p>
                  <button onClick={() => { setSelected(plan); setError(null); }} className={`mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold transition ${featured ? "bg-violet-500 shadow-[0_14px_38px_rgba(124,58,237,.3)] hover:bg-violet-400" : "border border-white/10 bg-white/[.05] hover:bg-white/[.09]"}`}>Choose {plan.name} <ArrowRight size={14} /></button>
                  <div className="my-7 h-px bg-white/[.07]" />
                  <ul className="space-y-3.5">{plan.features.map((feature) => <li key={feature} className="flex gap-3 text-[11px] text-zinc-400"><span className="grid size-4 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-emerald-300"><Check size={10} /></span>{feature}</li>)}</ul>
                </Card>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-6 text-[10px] text-zinc-600"><span className="flex items-center gap-2"><ShieldCheck size={13} className="text-emerald-400" /> Verified server-side</span><span className="flex items-center gap-2"><WalletCards size={13} className="text-violet-400" /> UPI, cards & netbanking via Razorpay</span></div>
      </section>
      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Complete subscription">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111113] p-6 shadow-2xl">
            <div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold">Complete with Razorpay</h2><p className="mt-1 text-xs text-zinc-500">{selected.name} · ₹{selected.amountInr}</p></div><button aria-label="Close" onClick={() => setSelected(null)} className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/[.06]"><X size={16} /></button></div>
            <div className="mt-5 rounded-2xl border border-violet-400/20 bg-violet-400/[.06] p-4"><WalletCards className="text-violet-300" size={22} /><p className="mt-3 text-xs font-medium">Secure Razorpay subscription</p><p className="mt-1 text-[10px] leading-5 text-zinc-500">UPI, cards and netbanking. Payment details never touch our servers.</p></div>
            {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[.06] p-3 text-xs text-rose-300">{error}</p>}
            <button disabled={processing} onClick={checkout} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-500 text-xs font-semibold transition hover:bg-violet-400 disabled:opacity-60">{processing ? "Preparing secure checkout…" : `Pay ₹${selected.amountInr}`} {!processing && <ArrowRight size={14} />}</button>
          </div>
        </div>
      )}
    </main>
  );
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay checkout."));
    document.head.appendChild(script);
  });
}
