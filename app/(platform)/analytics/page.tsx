"use client";

import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Flame,
  RotateCcw,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AccuracyAreaChart, MasteryRadarChart } from "@/components/charts";
import { useContentCatalog } from "@/lib/hooks/use-content-catalog";
import { Badge, Button, Card, ProgressBar, SectionTitle } from "@/components/ui";
import { useAppStore } from "@/lib/store";

const heatmap = Array.from({ length: 154 }, (_, index) => {
  const pattern = (index * 17 + index * index * 3) % 11;
  return pattern < 3 ? 0 : pattern < 6 ? 1 : pattern < 8 ? 2 : pattern < 10 ? 3 : 4;
});

const heatColors = [
  "bg-white/[.045]",
  "bg-violet-500/20",
  "bg-violet-500/40",
  "bg-violet-500/65",
  "bg-violet-400",
];

export default function AnalyticsPage() {
  const { questions, categories: contentCategories } = useContentCatalog();
  const quizAttempts = useAppStore((state) => state.quizAttempts);
  const mockReports = useAppStore((state) => state.mockReports);
  const progress = useAppStore((state) => state.progress);
  const streak = useAppStore((state) => state.streak);
  const liveAttempts = quizAttempts.map((attempt) => ({
    id: attempt.id,
    mode: attempt.mode,
    date: new Date(attempt.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
    score: Math.round((attempt.score / Math.max(attempt.total, 1)) * 100),
    total: attempt.total,
    time: `${Math.floor(attempt.timeSeconds / 60)}m ${attempt.timeSeconds % 60}s`,
  }));
  const attempts = liveAttempts.slice(0, 8);
  const currentAccuracy = liveAttempts.length
    ? Math.round(liveAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / liveAttempts.length)
    : 0;
  const mastered = Object.values(progress).filter((item) => item.status === "Mastered").length;
  const practiceSeconds = quizAttempts.reduce((sum, item) => sum + item.timeSeconds, 0) + mockReports.reduce((sum, item) => sum + item.timeSeconds, 0);
  const categories = contentCategories.map((category, index) => {
    const categoryQuestions = questions.filter((question) => question.categorySlug === category.slug);
    const categoryMastered = categoryQuestions.filter((question) => progress[question.id]?.status === "Mastered").length;
    return { ...category, mastery: category.total ? Math.round(categoryMastered / category.total * 100) : 0, color: ["#a78bfa","#22d3ee","#34d399","#f59e0b"][index % 4] };
  });
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.17em] text-violet-400">Performance intelligence</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Analytics</h1>
          <p className="mt-2 text-xs text-zinc-500">See what is improving, what needs revision, and where to focus next.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-10 items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.035] px-3 text-[10px] text-zinc-500"><CalendarDays size={14} /> Last 8 weeks <ChevronRight size={12} className="rotate-90" /></button>
          <Button variant="secondary"><Download size={14} /> Export</Button>
        </div>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Target, label: "Overall accuracy", value: `${currentAccuracy}%`, delta: quizAttempts.length ? `${quizAttempts.length} live` : "+6.2%", color: "text-violet-300 bg-violet-400/10" },
          { icon: CheckCircle2, label: "Mastered", value: String(mastered), delta: "Synced", color: "text-emerald-300 bg-emerald-400/10" },
          { icon: Clock3, label: "Practice time", value: `${(practiceSeconds / 3600).toFixed(1)}h`, delta: `${quizAttempts.length + mockReports.length} sessions`, color: "text-cyan-300 bg-cyan-400/10" },
          { icon: Flame, label: "Consistency", value: `${streak} days`, delta: "Current streak", color: "text-amber-300 bg-amber-400/10" },
        ].map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-start justify-between">
              <span className={`grid size-10 place-items-center rounded-xl ${stat.color}`}><stat.icon size={18} /></span>
              <Badge tone="green"><TrendingUp size={10} className="mr-1" />{stat.delta}</Badge>
            </div>
            <p className="mt-5 text-2xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-1 text-[10px] text-zinc-600">{stat.label}</p>
          </Card>
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="p-5">
          <SectionTitle
            eyebrow="8-week trend"
            title="Accuracy over time"
            action={<Badge tone="green"><TrendingUp size={10} className="mr-1" /> +36 pts</Badge>}
          />
          <div className="mt-5 h-[300px]"><AccuracyAreaChart /></div>
        </Card>
        <Card className="p-5">
          <SectionTitle eyebrow="Current mastery" title="Category radar" />
          <div className="mt-2 h-[320px]"><MasteryRadarChart /></div>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle eyebrow="AI interview history" title="Mock interview trajectory" />
          {mockReports.length ? (
            <div className="mt-5 space-y-3">
              {mockReports.slice(0, 4).map((report) => (
                <div key={report.id} className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-cyan-400/[.07] text-sm font-semibold text-cyan-300">{report.score}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-300">{report.technology} · {report.company}</p>
                    <p className="mt-1 text-[9px] text-zinc-600">{report.answered} answers · {Math.max(1, Math.ceil(report.timeSeconds / 60))} min</p>
                  </div>
                  <Badge tone={report.score >= 80 ? "green" : "amber"}>{report.level}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/[.08] bg-white/[.015] p-6 text-center">
              <BrainCircuit size={24} className="mx-auto text-violet-300" />
              <p className="mt-3 text-xs text-zinc-400">Your first AI interview report will appear here.</p>
              <Link href="/mock-interview" className="mt-3 inline-flex items-center gap-1 text-[10px] text-violet-300">Start interview <ArrowRight size={12} /></Link>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <SectionTitle eyebrow="Learning velocity" title="This week’s signal" />
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              [String(quizAttempts.length), "Quizzes"],
              [String(Object.keys(useAppStore.getState().flashcardReviews).length), "Cards reviewed"],
              [String(mockReports.length), "Mock sessions"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl border border-white/[.06] bg-white/[.02] p-4 text-center">
                <p className="text-xl font-semibold">{value}</p><p className="mt-1 text-[9px] text-zinc-600">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-violet-400/10 bg-violet-400/[.04] p-4 text-[10px] leading-5 text-zinc-500">
            Complete one adaptive quiz and one mock interview this week to unlock a reliable cross-mode readiness trend.
          </div>
        </Card>
      </section>

      <section className="mt-5">
        <Card className="p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-violet-400">154-day streak map</p>
              <h2 className="mt-1 text-lg font-semibold">Practice activity</h2>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-zinc-600">
              <span>Less</span>
              {heatColors.map((color) => <span key={color} className={`size-3 rounded-[3px] ${color}`} />)}
              <span>More</span>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto pb-2">
            <div className="grid min-w-[760px] grid-flow-col grid-rows-7 gap-1.5">
              {heatmap.map((level, index) => (
                <span
                  key={index}
                  title={`${level * 9} questions`}
                  className={`size-3.5 rounded-[3px] ${heatColors[level]} transition-transform hover:scale-125`}
                />
              ))}
            </div>
            <div className="mt-2 flex min-w-[760px] justify-between text-[9px] text-zinc-700">
              <span>March</span><span>April</span><span>May</span><span>June</span><span>July</span>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle eyebrow="Best categories" title="Top strengths" />
          <div className="mt-5 space-y-4">
            {categories.slice().sort((a, b) => b.mastery - a.mastery).slice(0, 4).map((category, index) => (
              <div key={category.slug} className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-emerald-400/[.07] text-[10px] font-semibold text-emerald-300">#{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-xs"><span>{category.name}</span><span className="text-emerald-300">{category.mastery}%</span></div>
                  <ProgressBar value={category.mastery} color="from-emerald-500 to-cyan-400" className="mt-2" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-amber-400/10 bg-gradient-to-br from-amber-500/[.045] to-transparent p-5">
          <SectionTitle eyebrow="Focus next" title="Top weaknesses" />
          <div className="mt-5 space-y-4">
            {categories.slice().sort((a, b) => a.mastery - b.mastery).slice(0, 4).map((category) => (
              <div key={category.slug} className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-amber-400/[.07] text-[10px] font-semibold text-amber-300"><TrendingDown size={14} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-xs"><span>{category.name}</span><span className="text-amber-300">{category.mastery}%</span></div>
                  <ProgressBar value={category.mastery} color="from-rose-500 to-amber-400" className="mt-2" />
                </div>
                <Link href={`/quiz`} className="grid size-8 place-items-center rounded-lg text-zinc-600 hover:bg-white/[.05] hover:text-violet-300"><ArrowRight size={14} /></Link>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <Card className="p-5">
          <SectionTitle eyebrow={`${(practiceSeconds / 3600).toFixed(1)} hours total`} title="Time by category" />
          <div className="mt-5 space-y-3.5">
            {[
              ["Kubernetes", 12.4, 27, "from-indigo-500 to-violet-400"],
              ["AWS", 8.7, 19, "from-orange-500 to-amber-400"],
              ["Docker", 7.6, 16, "from-sky-500 to-cyan-400"],
              ["Terraform", 6.2, 13, "from-violet-500 to-fuchsia-400"],
              ["Other", 11.9, 25, "from-zinc-500 to-zinc-400"],
            ].map(([label, hours, percentage, color]) => (
              <div key={String(label)}>
                <div className="flex justify-between text-[10px]"><span className="text-zinc-500">{label}</span><span>{hours}h</span></div>
                <ProgressBar value={Number(percentage) * 3.2} color={String(color)} className="mt-2" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[.07] p-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-violet-400">Recent history</p>
              <h2 className="mt-1 text-lg font-semibold">Quiz attempts</h2>
            </div>
            <Badge>{attempts.length} attempts</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead>
                <tr className="border-b border-white/[.06] text-[9px] uppercase tracking-wider text-zinc-700">
                  <th className="px-5 py-3 font-medium">Mode</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Score</th>
                  <th className="px-3 py-3 font-medium">Time</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="border-b border-white/[.05] last:border-0 hover:bg-white/[.02]">
                    <td className="px-5 py-4"><p className="text-xs text-zinc-300">{attempt.mode}</p><p className="mt-1 text-[9px] text-zinc-700">{attempt.id}</p></td>
                    <td className="px-3 py-4 text-[10px] text-zinc-600">{attempt.date}</td>
                    <td className="px-3 py-4"><Badge tone={attempt.score >= 80 ? "green" : "amber"}>{attempt.score}%</Badge></td>
                    <td className="px-3 py-4 text-[10px] text-zinc-600">{attempt.time}</td>
                    <td className="px-5 py-4 text-right"><Link href="/quiz" className="inline-flex items-center gap-1 text-[10px] text-violet-300"><RotateCcw size={12} /> Retry</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="mt-5">
        <Card className="relative overflow-hidden border-violet-400/10 bg-gradient-to-r from-violet-500/[.08] via-transparent to-cyan-500/[.05] p-6">
          <div className="premium-grid absolute inset-0 opacity-25" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-400/10 text-violet-300"><BrainCircuit size={22} /></span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Your personalized focus plan is ready</p>
              <p className="mt-1 max-w-2xl text-[10px] leading-5 text-zinc-500">Spend 20 minutes on Kubernetes networking, then take a 5-question Terraform state drill. This is the fastest route to lifting your overall score this week.</p>
            </div>
            <Link href="/quiz" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 text-xs font-medium text-white">Start focus session <ChevronRight size={14} /></Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
