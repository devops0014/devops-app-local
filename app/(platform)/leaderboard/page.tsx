"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, Flame, LoaderCircle, Search, Sparkles, Trophy } from "lucide-react";
import { Badge, Card, ProgressBar } from "@/components/ui";
import { loadLeaderboard } from "@/lib/repositories/gamification-repository";
import { useAppStore } from "@/lib/store";

type Leader = {
  rank: number;
  id?: string;
  name: string;
  levelName: string;
  xp: number;
  streak: number;
  accuracy?: number;
  initials: string;
  you?: boolean;
};

const fallbackLeaders: Leader[] = [
  { rank: 1, name: "Aarav Mehta", levelName: "DevOps Guru", xp: 12_840, streak: 31, accuracy: 92, initials: "AM" },
  { rank: 2, name: "Sneha Iyer", levelName: "Cloud Architect", xp: 12_420, streak: 27, accuracy: 91, initials: "SI" },
  { rank: 3, name: "Vikram Rao", levelName: "Kubernetes Pro", xp: 11_980, streak: 18, accuracy: 89, initials: "VR" },
  { rank: 4, name: "Priya Sharma", levelName: "Platform Engineer", xp: 8_020, streak: 22, accuracy: 86, initials: "PS" },
  { rank: 5, name: "Arjun Reddy", levelName: "DevOps Specialist", xp: 7_910, streak: 16, accuracy: 84, initials: "AR" },
  { rank: 6, name: "Mustafa Shaik", levelName: "Platform Engineer", xp: 7_840, streak: 14, accuracy: 78, initials: "MS", you: true },
  { rank: 7, name: "Rahul Verma", levelName: "Cloud Engineer", xp: 7_760, streak: 12, accuracy: 82, initials: "RV" },
  { rank: 8, name: "Ananya Das", levelName: "SRE Explorer", xp: 7_630, streak: 19, accuracy: 81, initials: "AD" },
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "all">("weekly");
  const [leaders, setLeaders] = useState<Leader[]>(fallbackLeaders);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const { xp, streak, levelName } = useAppStore();

  useEffect(() => {
    let active = true;
    void loadLeaderboard(period).then((result) => {
      if (!active) return;
      if (result?.leaders && result.leaders.length >= 3) setLeaders(result.leaders);
      setLoading(false);
    });
    return () => { active = false; };
  }, [period]);

  const enriched = useMemo(() => leaders.map((leader) => leader.you ? { ...leader, xp, streak, levelName } : leader), [leaders, levelName, streak, xp]);
  const filtered = enriched.filter((leader) => leader.name.toLowerCase().includes(query.toLowerCase()));
  const you = enriched.find((leader) => leader.you);
  const next = you ? enriched.find((leader) => leader.rank === you.rank - 1) : undefined;
  const xpToNext = you && next ? Math.max(0, next.xp - you.xp + 1) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="text-center">
        <Badge tone="amber"><Trophy size={11} className="mr-1" /> Live league</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">DevOps Champions</h1>
        <p className="mt-2 text-xs text-zinc-500">Earn verified XP through practice, quizzes, streaks, and mock interviews.</p>
      </div>

      <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 items-end gap-3">
        {[enriched[1], enriched[0], enriched[2]].filter(Boolean).map((leader, position) => {
          const center = position === 1;
          return (
            <Card key={leader.name} className={`relative overflow-hidden p-4 text-center ${center ? "border-amber-400/20 bg-gradient-to-b from-amber-400/[.08] to-transparent pb-7 pt-6" : ""}`}>
              {center && <Crown size={24} className="mx-auto mb-2 text-amber-300" fill="currentColor" />}
              <span className={`mx-auto grid place-items-center rounded-full bg-gradient-to-br text-sm font-semibold text-white ${center ? "size-16 from-amber-400 to-orange-500" : "size-12 from-violet-500 to-cyan-500"}`}>{leader.initials}</span>
              <p className="mt-3 truncate text-xs font-semibold">{leader.name}</p>
              <p className="mt-1 text-[9px] text-zinc-600">{leader.xp.toLocaleString()} XP</p>
              <span className={`absolute left-3 top-3 grid size-6 place-items-center rounded-full text-[10px] font-bold ${center ? "bg-amber-400 text-black" : "bg-white/[.06] text-zinc-400"}`}>{leader.rank}</span>
            </Card>
          );
        })}
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl border border-white/[.07] bg-white/[.025] p-1">
          {([["weekly", "Weekly"], ["monthly", "Monthly"], ["all", "All time"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => { setLoading(true); setPeriod(id); }} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] ${period === id ? "bg-white/[.07] text-white" : "text-zinc-600"}`}>
              {loading && period === id && <LoaderCircle size={10} className="animate-spin" />}{label}
            </button>
          ))}
        </div>
        <label className="flex h-9 w-full items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] px-3 sm:w-52">
          <Search size={13} className="text-zinc-600" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a learner..." className="min-w-0 flex-1 bg-transparent text-[10px] outline-none placeholder:text-zinc-700" />
        </label>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="grid grid-cols-[48px_1fr_90px_70px] border-b border-white/[.06] px-4 py-3 text-[9px] font-medium uppercase tracking-wider text-zinc-700 sm:grid-cols-[60px_1fr_120px_100px_130px]">
          <span>Rank</span><span>Learner</span><span>XP</span><span>Streak</span><span className="hidden sm:block">Level</span>
        </div>
        {filtered.map((leader) => (
          <div key={leader.id ?? leader.name} className={`grid grid-cols-[48px_1fr_90px_70px] items-center border-b border-white/[.05] px-4 py-3 last:border-0 sm:grid-cols-[60px_1fr_120px_100px_130px] ${leader.you ? "bg-violet-400/[.055]" : "hover:bg-white/[.02]"}`}>
            <span className={`text-xs ${leader.you ? "font-semibold text-violet-300" : "text-zinc-600"}`}>#{leader.rank}</span>
            <div className="flex min-w-0 items-center gap-3">
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-[10px] font-semibold ${leader.you ? "bg-violet-500 text-white" : "bg-white/[.05] text-zinc-400"}`}>{leader.initials}</span>
              <div className="min-w-0"><p className={`truncate text-xs ${leader.you ? "font-semibold text-violet-200" : "text-zinc-300"}`}>{leader.name}{leader.you && " (You)"}</p><p className="mt-1 text-[9px] text-zinc-700">{leader.levelName}</p></div>
            </div>
            <span className="text-[10px] text-zinc-500">{leader.xp.toLocaleString()}</span>
            <span className="flex items-center gap-1 text-[10px] text-amber-300"><Flame size={12} />{leader.streak}</span>
            <div className="hidden items-center gap-3 sm:flex"><ProgressBar value={Math.min(100, leader.rank <= 3 ? 100 - leader.rank * 8 : 62)} className="flex-1" /><span className="w-16 truncate text-[9px] text-zinc-500">{leader.levelName}</span></div>
          </div>
        ))}
      </Card>

      <Card className="mt-5 flex flex-col gap-4 border-violet-400/10 bg-gradient-to-r from-violet-500/[.07] to-cyan-500/[.04] p-5 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-400/10 text-violet-300"><Sparkles size={20} /></span>
        <div className="flex-1"><p className="text-sm font-semibold">{xpToNext ? `You’re only ${xpToNext.toLocaleString()} XP from rank #${next?.rank}` : "Keep building your verified XP"}</p><p className="mt-1 text-[10px] text-zinc-500">Complete hard questions or a mock interview to move up.</p></div>
        <Badge tone="violet">{you ? `Rank #${you.rank}` : "Live ranking"}</Badge>
      </Card>
    </div>
  );
}
