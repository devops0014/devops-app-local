"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Clock3,
  LockKeyhole,
  Map,
  Play,
  Route,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { Badge, Card, ProgressBar, SectionTitle } from "@/components/ui";
import { SpatialCard } from "@/components/spatial-card";
import { useContentCatalog } from "@/lib/hooks/use-content-catalog";
import { questionState, useAppStore } from "@/lib/store";

const roadmap = [
  {
    phase: "01",
    title: "Production Foundations",
    description: "Build the operating-system, networking and source-control instincts every senior DevOps answer depends on.",
    progress: 100,
    duration: "18 hours",
    xp: 1450,
    state: "complete",
    topics: ["Linux internals", "Networking", "Git workflows", "Bash safety"],
    color: "emerald",
    slugs: ["linux", "networking", "git", "scripting"],
  },
  {
    phase: "02",
    title: "CI/CD Engineering",
    description: "Design reliable pipelines, artifact promotion, quality gates and rollback workflows—not only Jenkins syntax.",
    progress: 74,
    duration: "14 hours",
    xp: 1100,
    state: "active",
    topics: ["Jenkins architecture", "Pipeline design", "SonarQube", "Release strategies"],
    color: "violet",
    slugs: ["cicd", "ci-cd", "jenkins"],
  },
  {
    phase: "03",
    title: "Container Platform",
    description: "Move from Docker fundamentals to production image design, runtime debugging and secure supply chains.",
    progress: 52,
    duration: "16 hours",
    xp: 1320,
    state: "available",
    topics: ["Images & layers", "Dockerfile", "Networking", "Production debugging"],
    color: "cyan",
    slugs: ["docker"],
  },
  {
    phase: "04",
    title: "Kubernetes Operations",
    description: "Master scheduling, traffic, storage, security, autoscaling and high-signal production troubleshooting.",
    progress: 31,
    duration: "28 hours",
    xp: 2400,
    state: "available",
    topics: ["Workloads", "Traffic flow", "Storage", "Troubleshooting"],
    color: "blue",
    slugs: ["kubernetes"],
  },
  {
    phase: "05",
    title: "Infrastructure & Cloud",
    description: "Connect Terraform design decisions with secure, resilient AWS architecture and controlled change.",
    progress: 0,
    duration: "24 hours",
    xp: 2050,
    state: "locked",
    topics: ["Terraform state", "Modules", "AWS architecture", "IAM & OIDC"],
    color: "amber",
    slugs: ["terraform", "aws"],
  },
  {
    phase: "06",
    title: "Observability & SRE",
    description: "Prove reliability using golden signals, Prometheus, Grafana, SLOs and actionable incident response.",
    progress: 0,
    duration: "16 hours",
    xp: 1500,
    state: "locked",
    topics: ["Prometheus", "Grafana", "Alerting", "SLO engineering"],
    color: "rose",
    slugs: ["monitoring", "prometheus", "grafana"],
  },
];

const glowMap: Record<string, "violet" | "cyan" | "amber" | "emerald"> = {
  emerald: "emerald",
  violet: "violet",
  cyan: "cyan",
  blue: "cyan",
  amber: "amber",
  rose: "amber",
};

export default function RoadmapPage() {
  const { questions } = useContentCatalog();
  const progressState = useAppStore((state) => state.progress);
  const xp = useAppStore((state) => state.xp);
  const liveRoadmap = roadmap.map((item) => {
    const phaseQuestions = questions.filter((question) => item.slugs.includes(question.categorySlug));
    const mastered = phaseQuestions.filter((question) => {
      const state = questionState(progressState, question.id);
      return state.status === "Mastered" && state.confidence >= 4;
    }).length;
    const progress = phaseQuestions.length ? Math.round(mastered / phaseQuestions.length * 100) : 0;
    return { ...item, progress, state: progress === 100 ? "complete" : progress > 0 ? "active" : "available" };
  });
  const totalQuestions = liveRoadmap.reduce((sum, item) => sum + questions.filter((question) => item.slugs.includes(question.categorySlug)).length, 0);
  const overall = totalQuestions ? Math.round(liveRoadmap.reduce((sum, item) => sum + questions.filter((question) => item.slugs.includes(question.categorySlug)).length * item.progress, 0) / totalQuestions) : 0;
  const completed = liveRoadmap.filter((item) => item.progress === 100).length;
  return (
    <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="cinematic-grid pointer-events-none absolute inset-0 opacity-20" />
      <section className="relative overflow-hidden rounded-3xl border border-white/[.07] bg-gradient-to-br from-violet-500/[.09] via-[#0d0d11] to-cyan-500/[.05] p-5 sm:p-7">
        <div className="absolute right-[-60px] top-[-100px] size-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative grid gap-7 xl:grid-cols-[1fr_380px] xl:items-center">
          <div>
            <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.18em] text-violet-300"><Route size={13} /> Your adaptive path</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-.05em] sm:text-4xl">From DevOps fundamentals to production interview mastery.</h1>
            <p className="mt-4 max-w-2xl text-xs leading-6 text-zinc-500">Every phase unlocks the knowledge required by the next. Your path adapts using confidence, quiz accuracy and revision history.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge tone="green"><Check size={11} className="mr-1" /> {completed} phases completed</Badge>
              <Badge tone="violet"><Zap size={11} className="mr-1" /> {xp.toLocaleString()} XP earned</Badge>
              <Badge><Clock3 size={11} className="mr-1" /> 62 hours remaining</Badge>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[.07] bg-black/25 p-5 backdrop-blur-xl">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[.14em] text-zinc-600">Overall completion</p>
                <p className="mt-2 text-3xl font-semibold">{overall}%</p>
              </div>
              <span className="grid size-11 place-items-center rounded-2xl bg-violet-400/10 text-violet-300"><Map size={21} /></span>
            </div>
            <ProgressBar value={overall} className="mt-5" />
            <p className="mt-3 text-[10px] text-zinc-600">You’re ahead of 68% of learners at this level.</p>
          </div>
        </div>
      </section>

      <section className="relative mt-7 grid gap-5 xl:grid-cols-[1fr_320px]">
        <div>
          <SectionTitle eyebrow="Six production phases" title="Learning roadmap" />
          <div className="relative mt-5 space-y-4 before:absolute before:bottom-12 before:left-[27px] before:top-12 before:w-px before:bg-gradient-to-b before:from-emerald-400/40 before:via-violet-400/25 before:to-white/[.04] sm:before:left-[35px]">
            {liveRoadmap.map((item, index) => (
              <motion.div key={item.phase} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .06 }}>
                <SpatialCard glow={glowMap[item.color]} className={`relative overflow-hidden p-4 sm:p-5 ${item.state === "active" ? "border-violet-400/20 bg-violet-400/[.045]" : ""}`}>
                  <div className="grid gap-4 sm:grid-cols-[52px_1fr_auto] sm:items-center">
                    <span className={`relative z-10 grid size-11 place-items-center rounded-2xl border font-mono text-[10px] ${
                      item.state === "complete" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" :
                      item.state === "active" ? "border-violet-400/30 bg-violet-400/12 text-violet-300" :
                      item.state === "locked" ? "border-white/[.07] bg-[#111114] text-zinc-700" :
                      "border-cyan-400/15 bg-cyan-400/[.06] text-cyan-400"
                    }`}>
                      {item.state === "complete" ? <Check size={17} /> : item.state === "locked" ? <LockKeyhole size={15} /> : item.phase}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold sm:text-base">{item.title}</h2>
                        {item.state === "active" && <Badge tone="violet">CURRENT</Badge>}
                        {item.state === "complete" && <Badge tone="green">MASTERED</Badge>}
                      </div>
                      <p className="mt-2 max-w-2xl text-[11px] leading-5 text-zinc-600">{item.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.topics.map((topic) => <span key={topic} className="rounded-lg border border-white/[.055] bg-white/[.025] px-2 py-1 text-[9px] text-zinc-600">{topic}</span>)}
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <ProgressBar value={item.progress} className="max-w-sm flex-1" color={item.state === "complete" ? "from-emerald-500 to-cyan-400" : undefined} />
                        <span className="text-[9px] text-zinc-600">{item.progress}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                      <div>
                        <p className="text-[10px] text-zinc-500">{item.duration}</p>
                        <p className="mt-1 text-[9px] text-amber-300">+{item.xp.toLocaleString()} XP</p>
                      </div>
                      {item.state !== "locked" ? (
                        <Link href={`/practice?category=${item.slugs[0]}`} className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/[.08] bg-white/[.04] px-3 text-[10px] text-zinc-300 hover:bg-white/[.07]">
                          {item.state === "active" ? <Play size={11} fill="currentColor" /> : null}
                          {item.state === "complete" ? "Review" : "Continue"}
                        </Link>
                      ) : (
                        <p className="mt-3 text-[9px] text-zinc-700">Complete Phase 04</p>
                      )}
                    </div>
                  </div>
                </SpatialCard>
              </motion.div>
            ))}
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card className="p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[.15em] text-violet-400">Recommended next</p>
            <h2 className="mt-3 text-base font-semibold">Jenkins Pipeline Reliability</h2>
            <p className="mt-2 text-[11px] leading-5 text-zinc-600">Your recent answers show strong syntax knowledge but weaker production troubleshooting structure.</p>
            <div className="mt-4 rounded-xl border border-white/[.06] bg-white/[.025] p-3">
              <div className="flex items-center justify-between text-[10px]"><span className="text-zinc-500">Focused session</span><span>5 questions</span></div>
              <div className="mt-2 flex items-center justify-between text-[10px]"><span className="text-zinc-500">Estimated time</span><span>12 minutes</span></div>
              <div className="mt-2 flex items-center justify-between text-[10px]"><span className="text-zinc-500">Reward</span><span className="text-amber-300">+180 XP</span></div>
            </div>
            <Link href="/practice?category=cicd" className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-500 text-xs font-medium shadow-[0_12px_30px_rgba(124,58,237,.2)] hover:brightness-110">Start session <ArrowRight size={13} /></Link>
          </Card>
          <Card className="overflow-hidden p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><Trophy size={18} /></span>
            <h2 className="mt-4 text-sm font-semibold">Path milestone</h2>
            <p className="mt-2 text-[11px] leading-5 text-zinc-600">Complete CI/CD Engineering to unlock the <span className="text-amber-300">Pipeline Architect</span> badge.</p>
            <div className="mt-4 flex items-center gap-3">
              <Target size={14} className="text-violet-300" />
              <div className="flex-1"><ProgressBar value={74} /></div>
              <span className="text-[9px] text-zinc-600">74%</span>
            </div>
          </Card>
          <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[.035] p-4">
            <div className="flex gap-3">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-cyan-300" />
              <p className="text-[10px] leading-5 text-zinc-500">The roadmap recalculates after quizzes and mock interviews, prioritizing concepts that reduce your interview risk fastest.</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
