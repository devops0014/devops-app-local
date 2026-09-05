"use client";

import { useEffect, useState } from "react";
import { Award, Check, Flame, LockKeyhole, Medal, ShieldCheck, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { Badge, Card, ProgressBar } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { levelProgress, nextLevelForXp } from "@/lib/gamification";

type Challenge = { id: string; name: string; description: string; cadence: string; target: number; xp_reward: number; progress: number };
type EarnedBadge = { slug: string; name: string; description: string; rarity: string; xp_reward: number; earned: boolean };

const fallbackChallenges: Challenge[] = [
  { id: "daily", name: "Daily Momentum", description: "Earn 50 XP today.", cadence: "daily", target: 50, xp_reward: 50, progress: 32 },
  { id: "quiz", name: "Quiz Operator", description: "Complete three quizzes this week.", cadence: "weekly", target: 3, xp_reward: 250, progress: 2 },
  { id: "master", name: "Mastery Sprint", description: "Master ten questions this week.", cadence: "weekly", target: 10, xp_reward: 300, progress: 6 },
];
const fallbackBadges: EarnedBadge[] = [
  { slug: "first-master", name: "First Deployment", description: "Master your first interview question.", rarity: "common", xp_reward: 50, earned: true },
  { slug: "quiz-sharpshooter", name: "Sharp Shooter", description: "Score at least 90% in a quiz.", rarity: "rare", xp_reward: 150, earned: true },
  { slug: "streak-seven", name: "Seven Day Uptime", description: "Maintain a seven-day learning streak.", rarity: "rare", xp_reward: 200, earned: true },
  { slug: "streak-thirty", name: "Always On", description: "Maintain a thirty-day learning streak.", rarity: "epic", xp_reward: 500, earned: false },
  { slug: "xp-7500", name: "Platform Engineer", description: "Earn 7,500 total XP.", rarity: "epic", xp_reward: 300, earned: true },
  { slug: "mock-ace", name: "Interview Ace", description: "Score at least 85 in a mock interview.", rarity: "legendary", xp_reward: 500, earned: false },
];

export default function AchievementsPage() {
  const { xp, streak, bestStreak, level, levelName } = useAppStore();
  const [challenges, setChallenges] = useState(fallbackChallenges);
  const [badges, setBadges] = useState(fallbackBadges);
  const next = nextLevelForXp(xp);

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const [challengeResult, progressResult, badgeResult, earnedResult] = await Promise.all([
        supabase.from("challenges").select("id,name,description,cadence,target,xp_reward").eq("is_active", true).order("ends_at"),
        supabase.from("user_challenge_progress").select("challenge_id,progress").eq("user_id", auth.user.id),
        supabase.from("badges").select("id,slug,name,description,rarity,xp_reward"),
        supabase.from("user_badges").select("badge_id").eq("user_id", auth.user.id),
      ]);
      if (challengeResult.data?.length) {
        const progress = new Map((progressResult.data ?? []).map((item) => [item.challenge_id, item.progress]));
        setChallenges(challengeResult.data.map((item) => ({ ...item, progress: progress.get(item.id) ?? 0 })));
      }
      if (badgeResult.data?.length) {
        const earned = new Set((earnedResult.data ?? []).map((item) => item.badge_id));
        setBadges(badgeResult.data.map((item) => ({ ...item, earned: earned.has(item.id) })));
      }
    };
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><Badge tone="violet"><Award size={11} className="mr-1" /> Achievement vault</Badge><h1 className="mt-4 text-3xl font-semibold tracking-[-.045em]">Your DevOps reputation</h1><p className="mt-2 text-xs text-zinc-500">Every reward is tied to verified learning activity.</p></div>
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/[.05] px-4 py-3"><Flame size={20} className="text-amber-300" fill="currentColor" /><div><p className="text-xs font-semibold">{streak} day streak</p><p className="text-[9px] text-zinc-600">Best: {bestStreak} days</p></div></div>
      </div>

      <Card className="mt-7 overflow-hidden border-violet-400/15 bg-gradient-to-r from-violet-500/[.09] to-cyan-500/[.04] p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="grid size-16 shrink-0 place-items-center rounded-[22px] border border-violet-400/20 bg-violet-400/10 text-violet-300"><ShieldCheck size={30} /></span>
          <div className="flex-1"><p className="font-mono text-[9px] uppercase tracking-[.16em] text-violet-300">Level {level}</p><h2 className="mt-1 text-xl font-semibold">{levelName}</h2><div className="mt-4 flex items-center gap-3"><ProgressBar value={levelProgress(xp)} className="flex-1" /><span className="text-[10px] text-zinc-500">{xp.toLocaleString()} XP</span></div><p className="mt-2 text-[9px] text-zinc-600">{Math.max(0, next.minXp - xp).toLocaleString()} XP until {next.name}</p></div>
        </div>
      </Card>

      <section className="mt-8">
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-violet-400">Active missions</p><h2 className="mt-1 text-xl font-semibold">Challenges</h2></div><Badge tone="cyan">{challenges.length} active</Badge></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {challenges.map((challenge) => {
            const value = Math.min(100, Math.round((challenge.progress / challenge.target) * 100));
            return <Card key={challenge.id} className="p-5" hover><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Target size={18} /></span><Badge tone={challenge.cadence === "daily" ? "amber" : "violet"}>{challenge.cadence}</Badge></div><h3 className="mt-5 text-sm font-semibold">{challenge.name}</h3><p className="mt-2 min-h-10 text-[10px] leading-5 text-zinc-500">{challenge.description}</p><div className="mt-5 flex justify-between text-[9px] text-zinc-600"><span>{challenge.progress} / {challenge.target}</span><span>+{challenge.xp_reward} XP</span></div><ProgressBar value={value} className="mt-2" />{value >= 100 && <p className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-300"><Check size={12} /> Challenge complete</p>}</Card>;
          })}
        </div>
      </section>

      <section className="mt-9">
        <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-amber-400">Collection</p><h2 className="mt-1 text-xl font-semibold">Badges</h2></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {badges.map((item, index) => {
            const Icon = [Medal, Target, Flame, Zap, ShieldCheck, Trophy][index % 6];
            const rarity = item.rarity === "legendary" ? "text-amber-300 bg-amber-400/10 border-amber-400/15" : item.rarity === "epic" ? "text-violet-300 bg-violet-400/10 border-violet-400/15" : "text-cyan-300 bg-cyan-400/10 border-cyan-400/15";
            return <Card key={item.slug} className={`relative flex items-center gap-4 p-4 ${!item.earned ? "opacity-50 grayscale" : ""}`}><span className={`grid size-12 shrink-0 place-items-center rounded-2xl border ${rarity}`}>{item.earned ? <Icon size={21} /> : <LockKeyhole size={19} />}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-xs font-semibold">{item.name}</p>{item.earned && <Sparkles size={11} className="text-amber-300" />}</div><p className="mt-1 text-[9px] leading-4 text-zinc-600">{item.description}</p><p className="mt-2 text-[8px] uppercase tracking-wider text-zinc-700">{item.rarity} · +{item.xp_reward} XP</p></div></Card>;
          })}
        </div>
      </section>
    </div>
  );
}
