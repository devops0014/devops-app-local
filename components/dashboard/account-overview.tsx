"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, BookOpenCheck, Laptop } from "lucide-react";
import { Card, ProgressBar } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";

type Overview = {
  sessions: { id: string; device_name: string; browser: string; last_active: string }[];
  quizzes: unknown[];
};

export function AccountOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const progress = useAppStore((state) => state.progress);
  const flashcardReviews = useAppStore((state) => state.flashcardReviews);

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

  const states = Object.values(progress);
  const mastered = states.filter((item) => item.status === "Mastered").length;
  const touched = states.filter((item) => item.status !== "Not Started").length;
  const reviewed = Object.keys(flashcardReviews).length;
  const masteredPercent = touched ? Math.round((mastered / touched) * 100) : 0;

  return <section className="mt-6 grid gap-3 xl:grid-cols-[.85fr_1.15fr_1fr]">
    <Card className="bg-gradient-to-br from-violet-500/[.11] to-transparent p-5">
      <div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><BadgeCheck size={18} /></span><Link href="/practice" className="text-[10px] text-violet-300">Start practising</Link></div>
      <p className="mt-5 text-[9px] uppercase tracking-[.16em] text-zinc-600">Your access</p>
      <h2 className="mt-1 text-lg font-semibold">Free · Full access</h2>
      <p className="mt-3 text-[10px] text-zinc-500">Question bank, quizzes and flashcards are free for everyone.</p>
    </Card>
    <Card className="p-5">
      <div className="flex items-center justify-between"><p className="text-[9px] uppercase tracking-[.16em] text-zinc-600">Study activity</p><BookOpenCheck size={15} className="text-cyan-300" /></div>
      <div className="mt-3"><div className="mb-1.5 flex justify-between text-[10px]"><span className="text-zinc-400">Questions mastered</span><span>{mastered} / {touched} attempted</span></div><ProgressBar value={masteredPercent} /></div>
      <p className="mt-4 text-[10px] text-zinc-400">{reviewed} flashcards reviewed · {data.quizzes.length} recent quizzes</p>
    </Card>
    <Card className="p-5">
      <div className="flex items-center justify-between"><p className="text-[9px] uppercase tracking-[.16em] text-zinc-600">Secure devices</p><Laptop size={15} className="text-emerald-300" /></div>
      <p className="mt-3 text-xl font-semibold">{data.sessions.length} <span className="text-xs font-normal text-zinc-600">/ 2 active</span></p>
      <div className="mt-3 space-y-2">{data.sessions.slice(0,2).map((session) => <div key={session.id} className="flex items-center justify-between text-[10px]"><span className="text-zinc-300">{session.device_name} · {session.browser}</span><span className="text-zinc-700">{new Date(session.last_active).toLocaleDateString()}</span></div>)}</div>
    </Card>
  </section>;
}
