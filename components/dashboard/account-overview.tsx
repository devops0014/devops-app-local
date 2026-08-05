"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Laptop, Sparkles, WalletCards } from "lucide-react";
import { Card, ProgressBar } from "@/components/ui";
import { planCatalog, type PlanId } from "@/lib/payments";
import { supabase } from "@/lib/supabase/client";

type Overview = {
  profile?: { subscription_plan?: PlanId | null; subscription_status?: string | null; subscription_expires_at?: string };
  subscription?: { plan?: PlanId | null; status?: string | null; current_period_end?: string };
  usage: { mock_interviews_used: number; resume_reviews_used: number };
  sessions: { id: string; device_name: string; browser: string; last_active: string }[];
  mockInterviews: unknown[];
  quizzes: unknown[];
};

export function AccountOverview() {
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => {
    void (async () => {
      if (!supabase) return;
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) return;
      const response = await fetch("/api/account/overview", { headers: { authorization: `Bearer ${auth.session.access_token}` } });
      if (response.ok) setData(await response.json() as Overview);
    })();
  }, []);
  if (!data) return <div className="mt-6 grid gap-3 lg:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.025]" />)}</div>;

  const active = ["active", "trialing"].includes(data.subscription?.status ?? data.profile?.subscription_status ?? "");
  const id = active ? (data.subscription?.plan ?? data.profile?.subscription_plan ?? null) : null;
  const plan = id ? planCatalog[id] : null;
  const renewal = data.subscription?.current_period_end ?? data.profile?.subscription_expires_at;
  const reset = new Date(); reset.setMonth(reset.getMonth() + 1, 1); reset.setHours(0,0,0,0);
  const mockPercent = plan?.mockInterviewLimit ? Math.min(100, data.usage.mock_interviews_used / plan.mockInterviewLimit * 100) : 0;
  const resumePercent = plan?.resumeReviewLimit ? Math.min(100, data.usage.resume_reviews_used / plan.resumeReviewLimit * 100) : 0;
  return <section className="mt-6 grid gap-3 xl:grid-cols-[.85fr_1.15fr_1fr]">
    <Card className="bg-gradient-to-br from-violet-500/[.11] to-transparent p-5">
      <div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><WalletCards size={18} /></span><Link href="/billing" className="text-[10px] text-violet-300">Manage</Link></div>
      <p className="mt-5 text-[9px] uppercase tracking-[.16em] text-zinc-600">Current subscription</p>
      <h2 className="mt-1 text-lg font-semibold">{plan ? `${plan.name} · ₹${plan.amountInr}` : "No active plan"}</h2>
      <p className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500"><CalendarClock size={13} /> {plan ? `Renews ${renewal ? new Date(renewal).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "after activation"}` : "Choose a plan to unlock premium access"}</p>
    </Card>
    <Card className="p-5">
      <div className="flex items-center justify-between"><p className="text-[9px] uppercase tracking-[.16em] text-zinc-600">AI usage</p><Sparkles size={15} className="text-cyan-300" /></div>
      <Usage label="Mock interviews" used={data.usage.mock_interviews_used} limit={plan?.mockInterviewLimit ?? 0} percent={mockPercent} />
      <Usage label="Resume reviews" used={data.usage.resume_reviews_used} limit={plan?.resumeReviewLimit ?? 0} percent={resumePercent} />
      <p className="mt-3 text-[9px] text-zinc-600">Resets {reset.toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
    </Card>
    <Card className="p-5">
      <div className="flex items-center justify-between"><p className="text-[9px] uppercase tracking-[.16em] text-zinc-600">Secure devices</p><Laptop size={15} className="text-emerald-300" /></div>
      <p className="mt-3 text-xl font-semibold">{data.sessions.length} <span className="text-xs font-normal text-zinc-600">/ 2 active</span></p>
      <div className="mt-3 space-y-2">{data.sessions.slice(0,2).map((session) => <div key={session.id} className="flex items-center justify-between text-[10px]"><span className="text-zinc-300">{session.device_name} · {session.browser}</span><span className="text-zinc-700">{new Date(session.last_active).toLocaleDateString()}</span></div>)}</div>
      <p className="mt-4 text-[9px] text-zinc-600">{data.mockInterviews.length} recent mocks · {data.quizzes.length} recent quizzes</p>
    </Card>
  </section>;
}

function Usage({ label, used, limit, percent }: { label: string; used: number; limit: number | null; percent: number }) {
  return <div className="mt-3"><div className="mb-1.5 flex justify-between text-[10px]"><span className="text-zinc-400">{label}</span><span>{limit === null ? `${used} · Fair usage` : `${used} / ${limit} · ${Math.max(0, limit-used)} left`}</span></div><ProgressBar value={percent} /></div>;
}
