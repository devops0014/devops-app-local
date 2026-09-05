"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Medal,
  Network,
  Play,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { useContentCatalog } from "@/lib/hooks/use-content-catalog";
import { Card, ProgressBar, SectionTitle } from "@/components/ui";
import { PerformanceLineChart } from "@/components/charts";
import { OrbitalProgress, SpatialCard } from "@/components/spatial-card";
import { useAppStore } from "@/lib/store";
import { AccountOverview } from "@/components/dashboard/account-overview";
import { useCurrentUser } from "@/lib/hooks/use-current-user";

export default function DashboardPage() {
  const { xp, level, levelName, streak, bestStreak, progress, quizAttempts, mockReports } = useAppStore();
  const { questions, categories: contentCategories } = useContentCatalog();
  const { profile } = useCurrentUser();
  const firstName = profile?.name?.split(/\s+/)[0] ?? "Student";
  const solved = Object.values(progress).filter((item) => item.status !== "Not Started").length;
  const accuracy = quizAttempts.length ? Math.round(quizAttempts.reduce((sum, item) => sum + item.score / Math.max(1, item.total) * 100, 0) / quizAttempts.length) : 0;
  const practiceSeconds = quizAttempts.reduce((sum, item) => sum + item.timeSeconds, 0) + mockReports.reduce((sum, item) => sum + item.timeSeconds, 0);
  const categories = contentCategories.map((category, index) => {
    const categoryQuestions = questions.filter((question) => question.categorySlug === category.slug);
    const mastered = categoryQuestions.filter((question) => progress[question.id]?.status === "Mastered").length;
    return { ...category, mastery: category.total ? Math.round(mastered / category.total * 100) : 0, color: ["#a78bfa","#22d3ee","#34d399","#f59e0b","#60a5fa"][index % 5] };
  });
  const recentQuestion = [...questions]
    .filter((question) => progress[question.id]?.lastAttemptAt || progress[question.id]?.status !== undefined)
    .sort((a, b) => +new Date(progress[b.id]?.lastAttemptAt || 0) - +new Date(progress[a.id]?.lastAttemptAt || 0))[0];
  const recentCategoryIndex = recentQuestion
    ? contentCategories.findIndex((category) => category.slug === recentQuestion.categorySlug)
    : -1;
  const orderedCategories = recentCategoryIndex >= 0
    ? [...contentCategories.slice(recentCategoryIndex), ...contentCategories.slice(0, recentCategoryIndex)]
    : contentCategories;
  const nextCategory = orderedCategories.find((category) => {
    const items = questions.filter((question) => question.categorySlug === category.slug);
    return items.length > 0 && items.some((question) => progress[question.id]?.status !== "Mastered");
  });
  const continueQuestion = nextCategory
    ? questions.find((question) => question.categorySlug === nextCategory.slug && progress[question.id]?.status !== "Mastered")
      ?? questions.find((question) => question.categorySlug === nextCategory.slug)
    : questions[0];
  const continueCategoryQuestions = continueQuestion ? questions.filter((item) => item.categorySlug === continueQuestion.categorySlug) : [];
  const continueCompleted = continueCategoryQuestions.filter((item) => progress[item.id]?.status === "Mastered").length;
  const continuePercent = continueCategoryQuestions.length ? Math.round(continueCompleted / continueCategoryQuestions.length * 100) : 0;
  const stats = [
    { label: "Questions solved", value: solved.toLocaleString(), delta: `${questions.length} available`, icon: BookOpenCheck, gradient: "from-violet-500/18 to-violet-500/[.02]", iconClass: "bg-violet-400/10 text-violet-300" },
    { label: "Overall accuracy", value: `${accuracy}%`, delta: `${quizAttempts.length} quizzes`, icon: Target, gradient: "from-cyan-500/16 to-cyan-500/[.02]", iconClass: "bg-cyan-400/10 text-cyan-300" },
    { label: "Current level", value: String(Math.max(1, Math.floor(xp / 1000) + 1)), delta: `${xp.toLocaleString()} XP`, icon: Trophy, gradient: "from-amber-500/16 to-amber-500/[.02]", iconClass: "bg-amber-400/10 text-amber-300" },
    { label: "Hours practiced", value: `${(practiceSeconds / 3600).toFixed(1)}h`, delta: `${mockReports.length} mocks`, icon: Clock3, gradient: "from-emerald-500/14 to-emerald-500/[.02]", iconClass: "bg-emerald-400/10 text-emerald-300" },
  ];

  return (
    <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="cinematic-grid pointer-events-none absolute inset-0 opacity-25" />
      <section aria-label="Experience points" className="relative mb-4 flex items-center justify-between overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-500/[.12] to-cyan-500/[.07] px-4 py-3 shadow-[0_16px_50px_rgba(124,58,237,.09)] lg:hidden">
        <div className="absolute -right-6 -top-10 size-28 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300"><Zap size={19} fill="currentColor" /></span>
          <div><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-zinc-500">Total XP</p><p className="mt-0.5 text-xl font-semibold tracking-tight">{xp.toLocaleString()} <span className="text-xs text-violet-300">XP</span></p></div>
        </div>
        <div className="relative text-right"><p className="text-xs font-semibold">Level {level}</p><p className="mt-1 text-[9px] text-zinc-500">{levelName}</p></div>
      </section>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="relative">
          <p className="mb-2 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[.18em] text-emerald-400"><span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> Command centre online</p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Welcome back, {firstName}</h1>
            <span className="text-2xl">👋</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">You’re 18 questions away from today’s goal. Keep the momentum going.</p>
        </div>
        <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-amber-400/15 bg-amber-400/[.055] px-4 py-3 shadow-[0_18px_60px_rgba(245,158,11,.07)]">
          <div className="absolute -left-8 -top-8 size-24 rounded-full bg-amber-400/10 blur-2xl" />
          <motion.span animate={{ filter: ["drop-shadow(0 0 2px #f59e0b)", "drop-shadow(0 0 12px #f59e0b)", "drop-shadow(0 0 2px #f59e0b)"] }} transition={{ duration: 1.8, repeat: Infinity }} className="relative grid size-9 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><Flame size={19} fill="currentColor" /></motion.span>
          <div>
            <p className="text-xs font-semibold">{streak} day streak</p>
            <p className="text-[10px] text-zinc-500">Personal best: {bestStreak} days</p>
          </div>
          <div className="ml-2 flex gap-1">
            {[1, 1, 1, 1, 1, 1, 0].map((done, index) => (
              <span
                key={index}
                className={`grid size-5 place-items-center rounded-md text-[8px] ${done ? "bg-amber-400/15 text-amber-300" : "bg-white/[.05] text-zinc-700"}`}
              >
                {done ? <Check size={10} /> : "S"}
              </span>
            ))}
          </div>
        </div>
      </section>
      <AccountOverview />

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
            <SpatialCard glow={index === 0 ? "violet" : index === 1 ? "cyan" : index === 2 ? "amber" : "emerald"} className={`relative min-h-[144px] bg-gradient-to-br ${stat.gradient} p-5`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[.12em] text-zinc-600">{stat.label}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">{stat.value}</p>
                  <p className="mt-2 flex items-center gap-1 text-[10px] text-zinc-500"><TrendingUp size={11} className="text-emerald-400" /> {stat.delta}</p>
                </div>
                <span className={`grid size-10 place-items-center rounded-xl ${stat.iconClass}`}><stat.icon size={18} /></span>
              </div>
              <div className="absolute -bottom-8 -right-8 size-24 rounded-full border border-white/[.045]" />
            </SpatialCard>
          </motion.div>
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.42fr_.78fr]">
        <SpatialCard glow="violet" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[.07] p-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-violet-400">Continue learning</p>
              <h2 className="mt-1 text-base font-semibold">{continueQuestion ? `${continueQuestion.category} interview preparation` : "Start your first learning session"}</h2>
            </div>
            <span className="rounded-full border border-white/[.08] bg-white/[.04] px-2.5 py-1 text-[9px] text-zinc-500">Hard · 12 min</span>
          </div>
          <div className="grid gap-6 p-5 md:grid-cols-[1fr_220px] md:items-center">
            <div>
              <p className="text-sm leading-6 text-zinc-300">{continueQuestion?.question ?? "Choose a category in the Question Bank to begin."}</p>
              <div className="mt-5 flex items-center gap-3">
                <ProgressBar value={continuePercent} className="flex-1" />
                <span className="text-[10px] text-zinc-500">{continueCompleted} of {continueCategoryQuestions.length}</span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Link href={continueQuestion ? `/practice?category=${continueQuestion.categorySlug}&question=${continueQuestion.id}` : "/practice"} className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-500 px-4 text-xs font-medium text-white transition hover:brightness-110">
                  <Play size={13} fill="currentColor" /> Continue
                </Link>
                <span className="text-[10px] text-zinc-600">{continueQuestion && progress[continueQuestion.id]?.lastAttemptAt ? `Last practiced ${new Date(progress[continueQuestion.id].lastAttemptAt!).toLocaleString()}` : "Ready when you are"}</span>
              </div>
            </div>
            <div className="relative hidden h-32 overflow-hidden rounded-2xl border border-white/[.07] bg-[#0b0b0d] p-4 md:block">
              <div className="premium-grid absolute inset-0 opacity-50" />
              <div className="relative flex h-full items-center justify-center">
                <div className="grid size-12 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><Network size={22} /></div>
                <div className="mx-2 h-px w-9 bg-gradient-to-r from-cyan-400/50 to-violet-400/50" />
                <div className="grid size-12 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300"><BrainCircuit size={22} /></div>
              </div>
            </div>
          </div>
        </SpatialCard>

        <SpatialCard glow="amber" className="border-rose-400/10 bg-gradient-to-br from-rose-500/[.07] to-transparent p-5">
          <div className="flex items-start justify-between">
            <span className="grid size-10 place-items-center rounded-xl bg-rose-400/10 text-rose-300"><Target size={19} /></span>
            <span className="rounded-full bg-rose-400/10 px-2 py-1 text-[9px] font-medium text-rose-300">WEAK AREA</span>
          </div>
          <h2 className="mt-5 text-base font-semibold">Kubernetes Networking</h2>
          <p className="mt-2 text-xs leading-5 text-zinc-500">Your accuracy dropped to 48%. A focused 5-question drill will strengthen the concepts you missed.</p>
          <div className="mt-4 flex items-center justify-between text-[10px] text-zinc-600">
            <span>Current mastery</span>
            <span>48%</span>
          </div>
          <ProgressBar value={48} className="mt-2" color="from-rose-500 to-orange-400" />
          <Link href="/quiz" className="mt-5 flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-rose-400/15 bg-rose-400/[.07] text-xs font-medium text-rose-200 hover:bg-rose-400/10">
            Practice 5 questions <ArrowRight size={13} />
          </Link>
        </SpatialCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="p-5">
          <SectionTitle
            eyebrow="Last 7 days"
            title="Accuracy trend"
            action={<span className="rounded-lg border border-white/[.07] bg-white/[.035] px-2.5 py-1.5 text-[10px] text-zinc-500">Jul 20 – Jul 26</span>}
          />
          <div className="mt-5 h-[245px]"><PerformanceLineChart /></div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Daily goal" eyebrow="Today" />
          <div className="mt-5 flex items-center gap-5">
            <OrbitalProgress value={64} color="#a78bfa" size={84} label="Daily goal" />
            <div>
              <p className="text-2xl font-semibold tracking-tight">32 <span className="text-sm font-normal text-zinc-600">/ 50</span></p>
              <p className="mt-1 text-[10px] text-zinc-500">questions completed</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              ["20m", "Time"],
              ["84%", "Accuracy"],
              [xp.toLocaleString(), "Total XP"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl bg-white/[.035] p-3 text-center">
                <p className="text-xs font-semibold">{value}</p>
                <p className="mt-1 text-[9px] text-zinc-600">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-violet-400/10 bg-violet-400/[.045] p-3">
            <Sparkles size={15} className="text-violet-300" />
            <p className="text-[10px] text-zinc-500">Complete 18 more to earn the <span className="text-violet-300">Goal Crusher</span> badge.</p>
          </div>
        </Card>
      </section>

      <section className="mt-8">
        <SectionTitle
          eyebrow="Your progress"
          title="Category mastery"
          action={<Link href="/analytics" className="flex items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200">View analytics <ChevronRight size={13} /></Link>}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {categories.slice(0, 10).map((category) => (
            <Link key={category.slug} href={`/practice?category=${category.slug}`}>
              <SpatialCard glow={category.mastery < 55 ? "amber" : category.mastery > 75 ? "emerald" : "violet"} className="flex min-h-[86px] items-center gap-3 p-4">
                <OrbitalProgress value={category.mastery} color={category.color} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{category.name}</p>
                  <p className="mt-1 text-[9px] text-zinc-600">{Math.round(category.total * category.mastery / 100)} / {category.total}</p>
                </div>
              </SpatialCard>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Recent achievements" />
          <div className="mt-4 space-y-2">
            {[
              { icon: Medal, title: "Kubernetes Pathfinder", copy: "Mastered 50 Kubernetes questions", color: "text-violet-300 bg-violet-400/10" },
              { icon: Flame, title: "Two Week Warrior", copy: "Maintained a 14-day learning streak", color: "text-amber-300 bg-amber-400/10" },
              { icon: Target, title: "Sharp Shooter", copy: "Scored above 90% in three quizzes", color: "text-cyan-300 bg-cyan-400/10" },
            ].map((badge) => (
              <div key={badge.title} className="flex items-center gap-3 rounded-xl border border-white/[.055] bg-white/[.022] p-3">
                <motion.span whileHover={{ rotateY: 180, scale: 1.08 }} transition={{ duration: 0.55 }} className={`grid size-9 place-items-center rounded-xl ${badge.color}`} style={{ transformStyle: "preserve-3d" }}><badge.icon size={17} /></motion.span>
                <div>
                  <p className="text-xs font-medium">{badge.title}</p>
                  <p className="mt-1 text-[9px] text-zinc-600">{badge.copy}</p>
                </div>
                <span className="ml-auto text-[9px] text-zinc-700">+250 XP</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Leaderboard pulse" action={<Link href="/leaderboard" className="text-[10px] text-violet-300">View all</Link>} />
          <div className="mt-4 space-y-2">
            {[
              ["#126", "Priya Sharma", "8,020 XP", "PS"],
              ["#127", "Arjun Reddy", "7,910 XP", "AR"],
              ["#128", "You", "7,840 XP", "MS"],
              ["#129", "Rahul Verma", "7,760 XP", "RV"],
            ].map(([rank, name, xp, avatar]) => (
              <div key={name} className={`flex items-center gap-3 rounded-xl p-2.5 ${name === "You" ? "border border-violet-400/15 bg-violet-400/[.06]" : ""}`}>
                <span className="w-8 text-[10px] text-zinc-600">{rank}</span>
                <span className="grid size-8 place-items-center rounded-lg bg-white/[.05] text-[9px] font-medium text-zinc-400">{avatar}</span>
                <span className={`text-xs ${name === "You" ? "font-medium text-violet-200" : "text-zinc-400"}`}>{name}</span>
                <span className="ml-auto text-[10px] text-zinc-600">{xp}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
