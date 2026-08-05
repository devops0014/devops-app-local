"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, CreditCard, LoaderCircle, ShieldCheck } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type Subscription = {
  provider: "razorpay";
  plan: "monthly" | "half_yearly" | "yearly";
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!supabase) { setLoading(false); return; }
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { setLoading(false); return; }
      const { data } = await supabase.from("subscriptions")
        .select("provider, plan, status, current_period_end, cancel_at_period_end")
        .eq("user_id", session.session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setSubscription(data as Subscription | null);
      setLoading(false);
    };
    void load();
  }, []);

  const cancel = async () => {
    if (!supabase) return;
    setCancelling(true);
    setMessage(null);
    const { data } = await supabase.auth.getSession();
    const response = await fetch("/api/payments/cancel", {
      method: "POST",
      headers: { authorization: `Bearer ${data.session?.access_token ?? ""}` },
    });
    const payload = (await response.json()) as { error?: string };
    if (response.ok) {
      setSubscription((current) => current ? { ...current, cancel_at_period_end: true } : current);
      setMessage("Cancellation scheduled. Your access remains active until the current period ends.");
    } else {
      setMessage(payload.error ?? "Could not update your subscription.");
    }
    setCancelling(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Badge tone="violet"><CreditCard size={11} className="mr-1" /> Billing</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Subscription & billing</h1>
        <p className="mt-2 text-xs text-zinc-500">Manage your DevOpsCrack access and renewal settings.</p>
      </div>
      <Card className="p-6">
        {loading ? (
          <div className="flex items-center gap-3 text-xs text-zinc-500"><LoaderCircle size={18} className="animate-spin text-violet-400" /> Loading subscription…</div>
        ) : subscription ? (
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-400" /><h2 className="font-semibold capitalize">{subscription.plan.replace("half_yearly", "6 months")} plan</h2></div>
              <div className="mt-5 grid gap-3 text-xs text-zinc-500 sm:grid-cols-2">
                <span className="flex items-center gap-2"><ShieldCheck size={15} /> Status: <strong className="capitalize text-zinc-200">{subscription.status}</strong></span>
                <span className="flex items-center gap-2"><CreditCard size={15} /> Provider: <strong className="capitalize text-zinc-200">{subscription.provider}</strong></span>
                <span className="flex items-center gap-2 sm:col-span-2"><CalendarClock size={15} /> Access until: <strong className="text-zinc-200">{subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Active"}</strong></span>
              </div>
              {subscription.cancel_at_period_end && <p className="mt-5 rounded-xl border border-amber-400/15 bg-amber-400/[.05] p-3 text-[10px] text-amber-200">Renewal is cancelled. Premium access remains available until the period ends.</p>}
              {message && <p className="mt-4 text-[10px] leading-5 text-zinc-400">{message}</p>}
            </div>
            {!subscription.cancel_at_period_end && <Button variant="secondary" onClick={cancel} disabled={cancelling}>{cancelling ? "Updating…" : "Cancel renewal"}</Button>}
          </div>
        ) : (
          <div>
            <h2 className="font-semibold">No billing record yet</h2>
            <p className="mt-2 text-xs text-zinc-500">Choose a plan to activate premium cloud access.</p>
            <Link href="/pricing" className="mt-5 inline-flex h-10 items-center rounded-xl bg-violet-500 px-4 text-xs font-medium text-white">View plans</Link>
          </div>
        )}
      </Card>
      <p className="text-[10px] leading-5 text-zinc-600">Payments are verified server-side. DevOpsCrack never stores complete card, UPI or banking details.</p>
    </div>
  );
}
