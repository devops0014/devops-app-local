"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  Activity, ArrowRight, BadgeCheck, BarChart3, Boxes, BrainCircuit, Check, ChevronRight,
  CircleGauge, CirclePlay, Cloud, Container, FileCheck2, Gauge, GitPullRequest, Layers3,
  MonitorSmartphone, Network, Quote, Rocket, ServerCog, ShieldCheck, TerminalSquare,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui";
import { AnimatedPipeline } from "@/components/landing/animated-pipeline";
import { GlowCard } from "@/components/landing/glow-card";
import { WorkflowJourney } from "@/components/landing/workflow-journey";
import { motionTokens } from "@/components/landing/constants";

const technologies = [
  ["Docker", "350", "86", "48", "45", "Intermediate", Container, "#38bdf8"],
  ["Kubernetes", "420", "118", "72", "58", "Advanced", Network, "#60a5fa"],
  ["Terraform", "280", "74", "54", "34", "Advanced", Boxes, "#8b5cf6"],
  ["AWS", "320", "92", "61", "42", "Intermediate", Cloud, "#f59e0b"],
  ["Linux", "260", "48", "43", "28", "Foundation", TerminalSquare, "#facc15"],
  ["Git", "180", "35", "22", "18", "Foundation", GitPullRequest, "#f97316"],
  ["Jenkins", "240", "66", "47", "32", "Intermediate", ServerCog, "#ef4444"],
  ["Helm", "120", "28", "21", "16", "Intermediate", Layers3, "#22d3ee"],
  ["ArgoCD", "110", "31", "25", "14", "Advanced", GitPullRequest, "#fb7185"],
  ["Prometheus", "160", "42", "34", "16", "Intermediate", Activity, "#f43f5e"],
  ["Grafana", "140", "34", "26", "14", "Intermediate", CircleGauge, "#fb923c"],
] as const;

const companies = [
  ["Accenture", "176", "4", "Hard", "#a855f7"], ["TCS", "204", "3", "Medium", "#ef4444"],
  ["Infosys", "188", "3", "Medium", "#38bdf8"], ["Cognizant", "168", "4", "Hard", "#22d3ee"],
  ["Capgemini", "154", "3", "Medium", "#00a3e0"], ["IBM Consulting", "146", "4", "Hard", "#60a5fa"],
  ["Wipro", "142", "3", "Medium", "#a78bfa"], ["HCLTech", "138", "3", "Medium", "#fb7185"],
  ["Deloitte", "132", "4", "Hard", "#84cc16"], ["Tech Mahindra", "126", "3", "Medium", "#f97316"],
] as const;

const plans = [
  { name: "Monthly", price: "₹199", subline: "Try it out", badge: "", save: "", features: ["2 AI Interviews", "1 Resume Review", "Unlimited Questions"] },
  { name: "6 Months", price: "₹799", subline: "Only ₹133/month", badge: "🔥 Most Popular", save: "Save 33%", features: ["15 AI Interviews", "5 Resume Reviews", "Unlimited Questions"] },
  { name: "Yearly", price: "₹999", subline: "Only ₹83/month", badge: "🏆 Best Value", save: "Save 58%", features: ["Fair Usage AI", "Fair Usage Resume Review", "Unlimited Questions"] },
];

export default function LandingPage() {
  const reducedMotion = useReducedMotion();
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen overflow-hidden bg-[#07070a] text-white">
      <Header />
      <section id="pipeline" className="living-background relative min-h-screen border-b border-white/[.055] pt-[72px]">
        <div className="cinematic-grid absolute inset-0 opacity-55" />
        <div className="absolute left-[-20%] top-[-34%] size-[760px] rounded-full bg-violet-600/[.13] blur-[150px]" />
        <div className="absolute right-[-16%] top-[20%] size-[640px] rounded-full bg-cyan-500/[.09] blur-[160px]" />
        <div className="relative mx-auto grid min-h-[calc(100vh-72px)] max-w-[1440px] items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.82fr_1.18fr]">
          <motion.div initial={reducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={motionTokens.reveal}>
            <div className="flex flex-wrap gap-2">
              <Badge tone="violet" className="gap-2 px-3 py-1.5"><Activity size={12} /> LIVE PIPELINE</Badge>
              <Badge className="px-3 py-1.5">Production interview preparation</Badge>
            </div>
            <h1 className="mt-7 max-w-3xl text-[48px] font-semibold leading-[.97] tracking-[-.064em] sm:text-6xl lg:text-[76px]">Watch DevOps <span className="gradient-text">in Action.</span></h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base sm:leading-8">Experience a real production pipeline from commit to monitoring—then master the decisions interviewers actually test.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black shadow-[0_18px_55px_rgba(255,255,255,.1)] transition hover:bg-cyan-50">Enter Command Centre <ArrowRight size={16} /></Link>
              <Link href="/practice" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/[.1] bg-white/[.035] px-5 text-sm font-medium text-zinc-200 backdrop-blur-xl transition hover:bg-white/[.065]"><CirclePlay size={16} /> Explore Questions</Link>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.07] sm:grid-cols-4">
              {[["10,000+", "Questions"], ["250+", "Mock Interviews"], ["500+", "Students"], ["95%", "Success Rate"]].map(([value, label]) => <div key={label} className="bg-[#0b0b0f]/90 p-3"><p className="text-sm font-semibold">{value}</p><p className="mt-1 text-[7px] uppercase tracking-[.12em] text-zinc-700">{label}</p></div>)}
            </div>
          </motion.div>
          <AnimatedPipeline />
        </div>
      </section>

      <LiveStats />

      <section id="journey" className="living-background relative border-y border-white/[.055] bg-[#09090c] py-24 sm:py-32">
        <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-violet-600/[.07] blur-[150px]" />
        <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8">
          <SectionHeading eyebrow="HOW IT WORKS" title="From learning to hired—one operating system." copy="A separate preparation journey powered by a calm purple energy signal. Completed stages stay visible; your next action stays obvious." />
          <WorkflowJourney />
        </div>
      </section>

      <section id="universe" className="living-background relative py-24 sm:py-32">
        <div className="cinematic-grid absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8">
          <SectionHeading eyebrow="QUESTION BANK" title="Your technology universe." copy="Structured questions, production scenarios, troubleshooting drills and hands-on labs across the DevOps stack." />
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {technologies.map(([name, questions, scenarios, troubleshooting, labs, difficulty, Icon, color], index) => (
              <motion.div key={name} initial={reducedMotion ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ delay: (index % 4) * .05 }}>
                <GlowCard glow={color} className="group min-h-[226px] p-5">
                  <div className="flex items-start justify-between"><span className="grid size-11 place-items-center rounded-2xl border bg-black/30" style={{ color, borderColor: `${color}35` }}><Icon size={20} /></span><span className="rounded-full border border-white/[.07] px-2 py-1 text-[8px] text-zinc-600">{difficulty}</span></div>
                  <h3 className="mt-5 text-base font-semibold">{name}</h3>
                  <div className="technology-metrics mt-4 grid grid-cols-2 gap-2 border-t border-white/[.06] pt-4"><MiniMetric value={questions} label="Questions" /><MiniMetric value={scenarios} label="Scenarios" /><MiniMetric value={troubleshooting} label="Troubleshooting" /><MiniMetric value={labs} label="Labs" /></div>
                  <Link href="/practice" className="mt-4 flex items-center justify-between text-[10px] text-zinc-600 transition group-hover:text-white">Open question bank <ChevronRight size={13} /></Link>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <CompanyMarquee />

      <section id="resources" className="relative border-b border-white/[.055] bg-[#09090c] py-24 sm:py-32">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <SectionHeading eyebrow="THE ACTUAL PRODUCT" title="Your interview command centre." copy="Readiness, AI allowance, resume usage, quiz momentum, active devices and your current plan—in one calm workspace." />
          <DashboardPreview />
        </div>
      </section>

      <section className="py-24 sm:py-32"><div className="mx-auto max-w-[1280px] px-5 sm:px-8"><SectionHeading eyebrow="STUDENT OUTCOMES" title="Prepared engineers tell better stories." copy="Confidence backed by practice, evidence and clear production thinking." /><Testimonials /></div></section>

      <section id="pricing" className="relative border-y border-white/[.055] bg-[#09090c] py-24 sm:py-32">
        <div className="absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-blue-600/[.07] blur-[150px]" />
        <div className="relative mx-auto max-w-[1180px] px-5 sm:px-8">
          <SectionHeading eyebrow="SIMPLE PRICING" title="Choose your interview runway." copy="Unlimited questions with AI support sized to your preparation window." />
          <div className="mt-12 grid gap-4 lg:grid-cols-3">{plans.map((plan, index) => <PricingCard key={plan.name} plan={plan} featured={index === 1} />)}</div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24 sm:py-32"><div className="cinematic-grid absolute inset-0 opacity-25" /><div className="relative mx-auto max-w-[980px] px-5 text-center sm:px-8"><span className="mx-auto grid size-14 place-items-center rounded-[20px] border border-cyan-400/20 bg-cyan-400/[.08] text-cyan-300 shadow-[0_0_55px_rgba(34,211,238,.13)]"><BadgeCheck size={25} /></span><h2 className="mx-auto mt-7 max-w-3xl text-4xl font-semibold tracking-[-.055em] sm:text-6xl">Learn. Practise. Deploy your career.</h2><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-zinc-500">Explain how production systems move, fail, recover and scale.</p><Link href="/pricing" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-black">Start preparing <ArrowRight size={15} /></Link></div></section>
      <Footer />
    </main>
  );
}

function Header() {
  return <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[.06] bg-[#07070a]/78 backdrop-blur-2xl"><div className="mx-auto flex h-[72px] max-w-[1440px] items-center px-5 sm:px-8"><Brand /><div className="mx-auto hidden items-center gap-6 text-[10px] text-zinc-500 lg:flex"><a href="#pipeline">Pipeline</a><a href="#journey">How it Works</a><a href="#universe">Question Bank</a><Link href="/roadmap">Roadmaps</Link><a href="#pricing">Pricing</a><a href="#resources">Resources</a></div><div className="ml-auto flex items-center gap-2 lg:ml-0"><Link href="/login" className="hidden h-9 items-center rounded-xl border border-white/[.09] px-4 text-[11px] font-medium text-zinc-300 transition hover:border-cyan-400/30 hover:bg-white/[.04] sm:inline-flex">Login</Link><Link href="/pricing" className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-300/20 bg-gradient-to-r from-violet-500 to-blue-500 px-4 text-[11px] font-semibold shadow-[0_12px_36px_rgba(59,130,246,.22)] transition hover:brightness-110"><Rocket size={13} /> Start Free</Link></div></div></nav>;
}

function LiveStats() {
  return <section className="border-b border-white/[.055] bg-[#08080b] py-8"><div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.07] md:grid-cols-5">{[[10000, "+", "Interview questions"], [250, "+", "Mock interviews"], [40, "+", "Companies"], [500, "+", "Students"], [95, "%", "Success rate"]].map(([value, suffix, label]) => <div key={label} className="bg-[#0b0b0f] p-5 text-center"><p className="text-xl font-semibold sm:text-2xl"><Counter value={Number(value)} suffix={String(suffix)} /></p><p className="mt-1 text-[8px] uppercase tracking-[.15em] text-zinc-700">{label}</p></div>)}</div></section>;
}

function CompanyMarquee() {
  return <section className="company-marquee-section border-y border-white/[.055] py-12"><div className="mx-auto max-w-[1440px]"><div className="mb-7 flex items-center justify-center gap-3 px-5"><span className="h-px w-10 bg-violet-500/40" /><p className="text-center text-[8px] font-semibold uppercase tracking-[.25em] text-zinc-500">Interview intelligence from teams you want to join</p><span className="h-px w-10 bg-cyan-500/40" /></div><div className="company-marquee overflow-hidden"><div className="company-marquee-track">{[...companies, ...companies].map(([name, questions, rounds, difficulty, color], index) => <div key={`${name}-${index}`} className="company-proof-card" style={{ "--company-color": color } as CSSProperties} aria-hidden={index >= companies.length}><div className="flex items-center gap-3"><span className="company-logo-mark">{name.slice(0, 2).toUpperCase()}</span><strong>{name}</strong></div><div className="mt-3 grid grid-cols-3 gap-3 border-t border-white/[.06] pt-3"><MiniMetric value={questions} label="Questions" /><MiniMetric value={rounds} label="Rounds" /><MiniMetric value={difficulty} label="Difficulty" /></div></div>)}</div></div></div></section>;
}

function DashboardPreview() {
  return <div className="relative mt-12 overflow-hidden rounded-[28px] border border-white/[.08] bg-[#0b0c11] p-4 shadow-[0_40px_120px_rgba(0,0,0,.42)] sm:p-6"><div className="premium-grid absolute inset-0 opacity-35" /><div className="relative flex items-center justify-between border-b border-white/[.06] pb-4"><div><p className="font-mono text-[8px] text-emerald-300">COMMAND_CENTRE / ONLINE</p><h3 className="mt-2 text-xl font-semibold">Good evening, Mustafa.</h3></div><span className="rounded-xl border border-violet-400/20 bg-violet-400/[.07] px-3 py-2 text-[9px] text-violet-200">6 Months · Active</span></div><div className="relative mt-4 grid gap-3 lg:grid-cols-[1.15fr_.85fr]"><div className="grid gap-3 sm:grid-cols-2"><PreviewCard icon={Gauge} label="Interview readiness" value="82%" detail="Strong in Docker & Git" progress={82} /><PreviewCard icon={BrainCircuit} label="AI mock interviews" value="34 / 50" detail="16 remaining" progress={68} /><PreviewCard icon={FileCheck2} label="Resume reviews" value="2 / 5" detail="3 remaining" progress={40} /><PreviewCard icon={BarChart3} label="Quiz progress" value="78%" detail="+9% this month" progress={78} /></div><div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-5"><p className="text-[8px] uppercase tracking-[.15em] text-zinc-600">Recent mock</p><div className="mt-4 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-cyan-400/[.08] text-cyan-300"><Cloud size={20} /></span><div><p className="text-xs font-medium">AWS + Kubernetes</p><p className="mt-1 text-[9px] text-zinc-600">Production troubleshooting · 28 min</p></div></div><div className="mt-5 grid grid-cols-3 gap-2"><MiniMetric value="8.4" label="Score" /><MiniMetric value="92%" label="Clarity" /><MiniMetric value="+120" label="XP" /></div><Link href="/analytics" className="mt-5 flex h-9 items-center justify-center gap-2 rounded-xl border border-white/[.08] bg-white/[.035] text-[9px] text-zinc-300">View feedback <ArrowRight size={11} /></Link></div></div><div className="relative mt-3 grid gap-3 rounded-2xl border border-white/[.07] bg-white/[.02] p-4 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-center"><div className="flex items-center gap-2 text-[9px] font-medium"><MonitorSmartphone size={15} className="text-cyan-300" /> Active devices</div><div className="rounded-xl border border-white/[.06] bg-black/25 px-3 py-2 text-[9px]"><span className="text-zinc-300">MacBook · Chrome</span><span className="ml-2 text-emerald-300">Current</span></div><div className="rounded-xl border border-white/[.06] bg-black/25 px-3 py-2 text-[9px]"><span className="text-zinc-300">iPhone · Safari</span><span className="ml-2 text-zinc-600">Yesterday</span></div><Link href="/billing" className="text-[9px] text-violet-300">Manage devices</Link></div></div>;
}

function PreviewCard({ icon: Icon, label, value, detail, progress }: { icon: ElementType; label: string; value: string; detail: string; progress: number }) {
  return <div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><div className="flex items-start justify-between"><span className="text-[9px] text-zinc-600">{label}</span><Icon size={14} className="text-cyan-300" /></div><p className="mt-3 text-xl font-semibold">{value}</p><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[.06]"><motion.span initial={{ width: 0 }} whileInView={{ width: `${progress}%` }} viewport={{ once: true }} transition={{ duration: 1 }} className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" /></div><p className="mt-2 text-[8px] text-zinc-600">{detail}</p></div>;
}

function Testimonials() {
  const items = [["AK", "Anjali Kumar", "DevOps Engineer · Accenture", "18 LPA offer", "The mock interview caught gaps in my Kubernetes traffic-flow explanation. I finally learned to answer like an engineer, not a tutorial."], ["RS", "Rahul Sharma", "Cloud Engineer · Capgemini", "2 offers", "The scenario bank made troubleshooting familiar. My production answers became structured and confident."], ["PN", "Priya Nair", "Platform Engineer · TCS", "Role upgraded", "The readiness dashboard showed exactly where to focus instead of revising everything."]];
  return <div className="testimonial-marquee mt-12 overflow-hidden"><div className="testimonial-track">{[...items, ...items].map(([initials, name, role, outcome, quote], index) => <motion.article key={`${name}-${index}`} whileHover={{ y: -5 }} className="w-[360px] shrink-0 rounded-2xl border border-white/[.07] bg-white/[.025] p-6 backdrop-blur-xl sm:w-[410px]"><Quote size={20} className="text-violet-400" /><p className="mt-5 text-sm leading-7 text-zinc-400">“{quote}”</p><div className="mt-7 flex items-center gap-3 border-t border-white/[.06] pt-5"><span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-[10px] font-semibold">{initials}</span><div className="min-w-0"><p className="text-xs font-medium">{name}</p><p className="mt-1 truncate text-[9px] text-zinc-600">{role}</p></div><span className="ml-auto rounded-full border border-emerald-400/15 bg-emerald-400/[.05] px-2 py-1 text-[8px] text-emerald-300">{outcome}</span></div></motion.article>)}</div></div>;
}

function PricingCard({ plan, featured }: { plan: typeof plans[number]; featured: boolean }) {
  return <GlowCard glow={featured ? "#8b5cf6" : "#60a5fa"} active={featured} className="p-7"><div className="flex min-h-6 justify-end">{plan.badge && <span className={`rounded-full px-3 py-1 text-[8px] font-semibold ${featured ? "bg-violet-500" : "border border-amber-400/20 text-amber-300"}`}>{plan.badge}</span>}</div><p className="text-xs text-zinc-500">{plan.name}</p><p className="mt-5 text-5xl font-semibold tracking-[-.05em]">{plan.price}</p><div className="mt-3 flex items-center gap-2 text-[10px]"><span className="text-zinc-500">{plan.subline}</span>{plan.save && <span className="rounded-full bg-emerald-400/[.08] px-2 py-1 text-emerald-300">{plan.save}</span>}</div><Link href="/pricing" className={`mt-7 flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-semibold ${featured ? "bg-violet-500" : "border border-white/[.09] bg-white/[.04]"}`}>Choose {plan.name} <ArrowRight size={13} /></Link><div className="my-6 h-px bg-white/[.06]" /><ul className="space-y-3">{plan.features.map((feature) => <li key={feature} className="flex items-center gap-2.5 text-[10px] text-zinc-400"><span className="grid size-4 place-items-center rounded-full bg-emerald-400/[.08] text-emerald-300"><Check size={10} /></span>{feature}</li>)}</ul></GlowCard>;
}

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null); const visible = useInView(ref, { once: true }); const reduced = useReducedMotion(); const [count, setCount] = useState(reduced ? value : 0);
  useEffect(() => { if (!visible || reduced) return; const start = performance.now(); let frame = 0; const tick = (now: number) => { const p = Math.min(1, (now - start) / 1100); setCount(Math.round(value * (1 - Math.pow(1 - p, 3)))); if (p < 1) frame = requestAnimationFrame(tick); }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame); }, [reduced, value, visible]);
  return <span ref={ref}>{count.toLocaleString("en-IN")}{suffix}</span>;
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) { return <div className="mx-auto max-w-2xl text-center"><p className="font-mono text-[9px] font-semibold tracking-[.2em] text-cyan-400">{eyebrow}</p><h2 className="mt-5 text-3xl font-semibold tracking-[-.05em] sm:text-5xl">{title}</h2><p className="mt-4 text-sm leading-7 text-zinc-500">{copy}</p></div>; }
function MiniMetric({ value, label }: { value: string; label: string }) { return <div><p className="text-[10px] font-semibold text-zinc-300">{value}</p><p className="mt-1 text-[7px] uppercase tracking-[.1em] text-zinc-700">{label}</p></div>; }
function Footer() { return <footer className="border-t border-white/[.055] bg-[#08080b]"><div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.5fr_repeat(3,1fr)]"><div><Brand /><p className="mt-4 max-w-xs text-[10px] leading-5 text-zinc-600">Master DevOps interviews through production thinking and deliberate practice.</p><p className="mt-5 flex items-center gap-2 text-[9px] text-emerald-300"><ShieldCheck size={13} /> Systems online</p></div>{[["Resources", ["Blog", "Interview Experiences", "Roadmaps"]], ["Platform", ["Practice", "Mock Interviews", "Analytics", "Pricing"]], ["Company", ["Contact", "Privacy", "Terms"]]].map(([heading, links]) => <div key={String(heading)}><p className="text-[10px] font-semibold">{heading}</p><div className="mt-4 space-y-3">{(links as string[]).map((link) => <a key={link} href="#" className="block text-[9px] text-zinc-600 hover:text-white">{link}</a>)}</div></div>)}</div><div className="border-t border-white/[.055] px-5 py-6 text-center text-[8px] text-zinc-700">© 2026 DevOpsCrack · Built for engineers who want the offer.</div></footer>; }
