"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight, BadgeCheck, BookOpenCheck, Check, Cloud, GraduationCap, Layers, MessageCircle, Timer, X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { siteConfig } from "@/lib/site-config";
import { rememberInterestTopic } from "@/lib/attribution";
import { cn } from "@/lib/utils";

const SIGNUP = "/login?mode=signup";

type Sample = { topic: string; question: string; code?: string; options: string[]; answer: number; why: string };

const samples: Sample[] = [
  {
    topic: "Kubernetes",
    question: "A pod is in CrashLoopBackOff. Which command shows the logs of the container that just crashed?",
    options: ["kubectl logs my-pod --previous", "kubectl describe pod my-pod --logs", "kubectl get events --previous", "kubectl logs my-pod --tail=0"],
    answer: 0,
    why: "After a restart, plain kubectl logs shows the new container. Adding --previous (or -p) returns the logs of the instance that crashed, which is where the error is.",
  },
  {
    topic: "Docker",
    question: "Why copy package files and install dependencies before copying the rest of the source?",
    code: "COPY package*.json ./\nRUN npm ci\nCOPY . .",
    options: ["It makes the final image smaller", "The install layer stays cached when only source code changes", "npm ci requires it", "It runs the container as non-root"],
    answer: 1,
    why: "Each instruction is a cached layer. If only your code changes, Docker reuses the dependency layer instead of reinstalling everything, so rebuilds take seconds.",
  },
  {
    topic: "Terraform",
    question: "Two engineers run terraform apply on the same infrastructure at the same time. What prevents a corrupted state?",
    options: ["Running terraform fmt first", "A remote backend with state locking", "Using separate .tfvars files", "terraform validate in CI"],
    answer: 1,
    why: "A remote backend that supports locking (for example S3 with locking, or Terraform Cloud) lets only one apply hold the state at a time. The second run waits or fails safely.",
  },
];

/** Hero tool picker. `slug` matches the question bank category; `icon` is a file in /public/category-icons. */
const interviewTools: { name: string; slug: string; icon?: string; color: string }[] = [
  { name: "Linux", slug: "linux", icon: "linux", color: "#FCC624" },
  { name: "Git", slug: "git", icon: "git", color: "#F05032" },
  { name: "Docker", slug: "docker", icon: "docker", color: "#2496ED" },
  { name: "Kubernetes", slug: "kubernetes", icon: "kubernetes", color: "#326CE5" },
  { name: "Helm", slug: "helm", icon: "helm", color: "#277A9F" },
  { name: "Terraform", slug: "terraform", icon: "terraform", color: "#844FBA" },
  { name: "Ansible", slug: "ansible", icon: "ansible", color: "#EE0000" },
  { name: "AWS", slug: "aws", color: "#FF9900" },
  { name: "Jenkins", slug: "jenkins", icon: "jenkins", color: "#D24939" },
  { name: "GitHub Actions", slug: "github-actions", icon: "githubactions", color: "#2088FF" },
  { name: "ArgoCD", slug: "argocd", icon: "argo", color: "#EF7B4D" },
  { name: "Prometheus", slug: "prometheus", icon: "prometheus", color: "#E6522C" },
];

export default function LandingPage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-[#09090b] text-zinc-100">
      <Header />
      <Hero />
      <TrySection />
      <Tools />
      <Steps />
      <Course />
      <FinalCta />
      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[.06] bg-[#09090b]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Brand />
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex" aria-label="Page sections">
          <a href="#try" className="hover:text-white">Try a question</a>
          <a href="#tools" className="hover:text-white">What you get</a>
          <a href="#how" className="hover:text-white">How it works</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className="hidden h-10 items-center rounded-xl px-4 text-sm text-zinc-300 hover:text-white sm:inline-flex">Sign in</Link>
          <Link href={SIGNUP} className="inline-flex h-10 items-center rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition hover:bg-violet-400">Start free</Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const reduced = useReducedMotion();
  return (
    <section className="relative overflow-hidden border-b border-white/[.06]">
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 size-[560px] rounded-full bg-violet-600/[.12] blur-[140px]" />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14 lg:pb-24 lg:pt-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[.07] px-3 py-1 text-sm text-emerald-200">
            <BadgeCheck size={15} /> Free for everyone
          </p>
          <h1 className="mt-5 max-w-xl text-[40px] font-semibold leading-[1.04] tracking-[-.045em] text-white sm:text-6xl">
            Crack your DevOps interview.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-zinc-300">
            Real interview questions with clear answers, timed quizzes and flashcards for Docker, Kubernetes, Terraform, AWS, Linux and CI/CD.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={SIGNUP} className="inline-flex h-12 items-center justify-center rounded-xl bg-violet-500 px-6 text-base font-semibold text-white shadow-[0_14px_40px_rgba(139,92,246,.3)] transition hover:bg-violet-400">
              Start preparing free
            </Link>
            <a href="#try" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/[.12] px-6 text-base text-zinc-200 transition hover:border-white/25">
              Try 3 questions first
            </a>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
            <MessageCircle size={15} className="text-emerald-400" /> Sign up with email or Google in under a minute
          </p>
        </div>
        <motion.div initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
          <ToolPicker />
        </motion.div>
      </div>
    </section>
  );
}

/** The hero: "What's your interview on?" — one tap opens sign-up for that topic. */
function ToolPicker() {
  const pick = (slug: string) => rememberInterestTopic(slug);
  return (
    <div className="rounded-[22px] border border-white/[.09] bg-[#111113] p-5 shadow-[0_30px_100px_rgba(0,0,0,.45)] sm:p-6">
      <h2 className="text-xl font-semibold tracking-[-.02em] text-white">What&rsquo;s your interview on?</h2>
      <p className="mt-1 text-sm text-zinc-400">Pick a tool and start with its questions.</p>
      <ul className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5">
        {interviewTools.map((tool) => (
          <li key={tool.slug}>
            <Link
              href={SIGNUP}
              onClick={() => pick(tool.slug)}
              className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-white/[.08] bg-white/[.02] p-2 text-center transition hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
              style={{ ["--tool" as string]: tool.color }}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-white shadow-[0_6px_20px_rgba(0,0,0,.25)] transition group-hover:shadow-[0_0_0_3px_var(--tool)] sm:size-12">
                {tool.icon
                  ? <img src={`/category-icons/${tool.icon}.svg`} alt="" width={26} height={26} className="size-6 sm:size-7" />
                  : <Cloud size={24} style={{ color: tool.color }} aria-hidden />}
              </span>
              <span className="text-[13px] font-medium leading-tight text-zinc-200 group-hover:text-white">{tool.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-zinc-500">Plus Nginx, Grafana, Python and more inside.</p>
    </div>
  );
}

function TrySection() {
  return (
    <section id="try" className="scroll-mt-20 border-b border-white/[.06] py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:items-start lg:gap-14">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-.03em] text-white sm:text-4xl">Try three real interview questions</h2>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-zinc-300">No sign-up needed. Each answer comes with a short explanation, the same way every question in the bank does.</p>
        </div>
        <TryQuestion />
      </div>
    </section>
  );
}

/** Answer a real interview question right on the page. */
function TryQuestion() {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const done = index >= samples.length;
  const sample = samples[Math.min(index, samples.length - 1)];

  const choose = (option: number) => {
    if (picked !== null) return;
    setPicked(option);
    if (option === sample.answer) setCorrectCount((value) => value + 1);
  };
  const next = () => { setPicked(null); setIndex((value) => value + 1); };

  return (
    <div className="rounded-[22px] border border-white/[.09] bg-[#111113] p-5 shadow-[0_30px_100px_rgba(0,0,0,.45)] sm:p-7">
      {done ? (
        <div className="py-6 text-center">
          <p className="text-5xl font-semibold tracking-tight text-white">{correctCount}/{samples.length}</p>
          <p className="mt-3 text-lg text-zinc-200">{correctCount === samples.length ? "Interview-ready on these. Now try the full bank." : "That's the kind of gap interviews find. Close it before they do."}</p>
          <p className="mt-2 text-sm text-zinc-400">Many more questions like these, each with an explanation, are waiting.</p>
          <Link href={SIGNUP} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-violet-500 text-base font-semibold text-white hover:bg-violet-400">Unlock all questions free</Link>
          <button onClick={() => { setIndex(0); setPicked(null); setCorrectCount(0); }} className="mt-3 text-sm text-zinc-400 hover:text-white">Try again</button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="rounded-full bg-violet-400/10 px-2.5 py-1 font-medium text-violet-200">{sample.topic}</span>
            <span className="text-zinc-500">Question {index + 1} of {samples.length}</span>
          </div>
          <h2 className="mt-4 text-lg font-medium leading-7 text-white sm:text-xl">{sample.question}</h2>
          {sample.code && (
            <pre className="mt-3 overflow-x-auto rounded-xl border border-white/[.07] bg-black/40 p-3 font-mono text-[13px] leading-6 text-cyan-200">{sample.code}</pre>
          )}
          <ul className="mt-4 space-y-2">
            {sample.options.map((option, optionIndex) => {
              const isAnswer = optionIndex === sample.answer;
              const isPicked = optionIndex === picked;
              const revealed = picked !== null;
              return (
                <li key={option}>
                  <button
                    onClick={() => choose(optionIndex)}
                    disabled={revealed}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-[15px] transition",
                      !revealed && "border-white/[.1] text-zinc-200 hover:border-violet-400/50 hover:bg-violet-400/[.05]",
                      revealed && isAnswer && "border-emerald-400/50 bg-emerald-400/[.08] text-emerald-100",
                      revealed && isPicked && !isAnswer && "border-rose-400/50 bg-rose-400/[.08] text-rose-100",
                      revealed && !isAnswer && !isPicked && "border-white/[.06] text-zinc-500",
                    )}
                  >
                    <span className={cn("min-w-0 flex-1", /^(kubectl|docker|terraform)/.test(option) && "font-mono text-[14px]")}>{option}</span>
                    {revealed && isAnswer && <Check size={18} className="shrink-0 text-emerald-300" />}
                    {revealed && isPicked && !isAnswer && <X size={18} className="shrink-0 text-rose-300" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {picked !== null ? (
            <div className="mt-4">
              <p className="rounded-xl border border-white/[.07] bg-white/[.03] p-4 text-[15px] leading-7 text-zinc-300">
                <strong className={picked === sample.answer ? "text-emerald-300" : "text-rose-300"}>{picked === sample.answer ? "Correct. " : "Not quite. "}</strong>
                {sample.why}
              </p>
              <button onClick={next} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-white text-[15px] font-semibold text-black hover:bg-zinc-200">
                {index + 1 < samples.length ? "Next question" : "See my score"}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">Pick an answer. No sign-up needed.</p>
          )}
        </>
      )}
    </div>
  );
}

function Tools() {
  const reduced = useReducedMotion();
  const tools = [
    {
      icon: BookOpenCheck, name: "Question bank",
      copy: "Questions grouped by tool and difficulty, each with a clear answer. Mark what you've mastered, bookmark what to revise and add your own notes.",
      screen: <QuestionScreen />,
    },
    {
      icon: Timer, name: "Quizzes",
      copy: "Timed and classic quizzes across one topic or many. See right and wrong instantly, then review every answer at the end.",
      screen: <QuizScreen />,
    },
    {
      icon: Layers, name: "Flashcards",
      copy: "Flip through cards before an interview. Anything you don't know comes back sooner, so revision time goes where you need it.",
      screen: <FlashcardScreen />,
    },
  ];
  return (
    <section id="tools" className="scroll-mt-20 border-b border-white/[.06] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="max-w-xl text-3xl font-semibold tracking-[-.03em] text-white sm:text-4xl">Three ways to prepare, all free</h2>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-zinc-400">This is what you get inside. No trial, no card, nothing locked.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {tools.map((tool, index) => (
            <motion.article
              key={tool.name}
              initial={reduced ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
              className="flex flex-col overflow-hidden rounded-[22px] border border-white/[.08] bg-[#111113]"
            >
              <div aria-hidden className="relative h-[230px] overflow-hidden border-b border-white/[.06] bg-[radial-gradient(120%_90%_at_50%_0%,rgba(139,92,246,.16),transparent_70%)] px-5 pt-6">
                {tool.screen}
              </div>
              <div className="p-5">
                <h3 className="flex items-center gap-2.5 text-lg font-semibold text-white"><tool.icon size={20} className="text-violet-300" /> {tool.name}</h3>
                <p className="mt-2 text-[15px] leading-7 text-zinc-300">{tool.copy}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Code-drawn previews of the real screens (no screenshots to keep up to date). */
function ScreenFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto h-full max-w-[300px] rounded-t-2xl border border-b-0 border-white/[.1] bg-[#0c0c0e] p-4 shadow-[0_-10px_50px_rgba(0,0,0,.4)]">
      {children}
    </div>
  );
}

function QuestionScreen() {
  return (
    <ScreenFrame>
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-full bg-sky-400/10 px-2 py-0.5 font-medium text-sky-200">Kubernetes</span>
        <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-amber-200">Medium</span>
      </div>
      <p className="mt-3 text-sm font-medium leading-6 text-white">Deployment vs StatefulSet: when do you need a StatefulSet?</p>
      <div className="mt-3 space-y-1.5">
        <span className="block h-2 w-full rounded-full bg-white/[.08]" />
        <span className="block h-2 w-11/12 rounded-full bg-white/[.08]" />
        <span className="block h-2 w-3/4 rounded-full bg-white/[.08]" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <span className="flex h-8 items-center justify-center gap-1 rounded-lg bg-emerald-400/15 font-medium text-emerald-200"><Check size={13} /> Mastered</span>
        <span className="flex h-8 items-center justify-center rounded-lg border border-white/[.1] text-zinc-300">Revise later</span>
      </div>
    </ScreenFrame>
  );
}

function QuizScreen() {
  return (
    <ScreenFrame>
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>Question 7 of 10</span>
        <span className="flex items-center gap-1 font-mono text-amber-200"><Timer size={12} /> 00:42</span>
      </div>
      <span className="mt-2 block h-1 rounded-full bg-white/[.08]"><span className="block h-1 w-[70%] rounded-full bg-violet-400" /></span>
      <p className="mt-3 text-sm font-medium leading-6 text-white">Which file stores Terraform&rsquo;s view of real infrastructure?</p>
      <ul className="mt-3 space-y-1.5 text-xs">
        <li className="flex h-8 items-center gap-2 rounded-lg border border-emerald-400/50 bg-emerald-400/[.1] px-2.5 text-emerald-100"><span className="font-semibold">A</span> terraform.tfstate <Check size={13} className="ml-auto" /></li>
        <li className="flex h-8 items-center gap-2 rounded-lg border border-rose-400/50 bg-rose-400/[.1] px-2.5 text-rose-100"><span className="font-semibold">B</span> main.tf <X size={13} className="ml-auto" /></li>
        <li className="flex h-8 items-center gap-2 rounded-lg border border-white/[.07] px-2.5 text-zinc-500"><span className="font-semibold">C</span> .terraform.lock.hcl</li>
      </ul>
    </ScreenFrame>
  );
}

function FlashcardScreen() {
  const reduced = useReducedMotion();
  return (
    <ScreenFrame>
      <div className="relative h-[150px] [perspective:900px]">
        <motion.div
          className="relative size-full [transform-style:preserve-3d]"
          animate={reduced ? undefined : { rotateY: [0, 0, 180, 180, 0] }}
          transition={{ duration: 7, repeat: Infinity, times: [0, 0.4, 0.5, 0.9, 1], ease: "easeInOut" }}
        >
          <div className="absolute inset-0 flex flex-col justify-between rounded-xl border border-white/[.1] bg-gradient-to-br from-violet-500/20 to-transparent p-4 [backface-visibility:hidden]">
            <span className="text-xs text-violet-200">Docker</span>
            <p className="text-sm font-medium leading-6 text-white">What does a multi-stage build give you?</p>
            <span className="text-xs text-zinc-500">Tap to flip</span>
          </div>
          <div className="absolute inset-0 flex flex-col justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="text-sm leading-6 text-emerald-50">A small final image: build tools stay in the first stage, only the output is copied into the runtime stage.</p>
          </div>
        </motion.div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <span className="flex h-8 items-center justify-center rounded-lg border border-white/[.1] text-zinc-300">Again</span>
        <span className="flex h-8 items-center justify-center rounded-lg bg-emerald-400/15 font-medium text-emerald-200">Got it</span>
      </div>
    </ScreenFrame>
  );
}

function Steps() {
  const steps = [
    { title: "Create your account", copy: "Email and password, or one tap with Google." },
    { title: "Add your mobile number", copy: "So we can help with your preparation. Use your own number." },
    { title: "Start practising", copy: "Pick a topic, take a quiz or revise with flashcards. Progress saves automatically." },
  ];
  return (
    <section id="how" className="scroll-mt-20 border-b border-white/[.06] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-[-.03em] text-white sm:text-4xl">Up and running in a minute</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-violet-400/40 text-base font-semibold text-violet-200">{index + 1}</span>
              <div>
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-1 text-[15px] leading-7 text-zinc-400">{step.copy}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href={SIGNUP} className="mt-10 inline-flex h-12 items-center justify-center rounded-xl bg-violet-500 px-6 text-base font-semibold text-white hover:bg-violet-400">Create free account</Link>
      </div>
    </section>
  );
}

function Course() {
  const mentor = siteConfig.mentor;
  return (
    <section className="border-b border-white/[.06] py-16 sm:py-20">
      <div className={cn("mx-auto grid max-w-6xl gap-10 px-4 sm:px-6", mentor.name && "lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-14")}>
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-violet-400/10 text-violet-200"><GraduationCap size={26} /></span>
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-[-.02em] text-white sm:text-3xl">Want a mentor in your corner?</h2>
            <p className="mt-3 text-[15px] leading-7 text-zinc-300">
              When you're ready for more than self-study, the {siteConfig.course.name} adds {siteConfig.course.pitch.charAt(0).toLowerCase() + siteConfig.course.pitch.slice(1)}
            </p>
            <p className="mt-3 text-sm text-zinc-400">Start with the free platform. You can request a callback from inside the app whenever you like.</p>
            {siteConfig.course.url && (
              <a href={siteConfig.course.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-11 items-center rounded-xl border border-white/[.12] px-5 text-sm text-zinc-100 hover:border-white/25">About the course</a>
            )}
          </div>
        </div>
        {mentor.name && <MentorCard />}
      </div>
    </section>
  );
}

/** "Who's behind this". Filled from siteConfig.mentor; hidden until a name is set. */
function MentorCard() {
  const mentor = siteConfig.mentor;
  const initials = mentor.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <figure aria-labelledby="mentor-name" className="relative overflow-hidden rounded-[22px] border border-white/[.09] bg-[#111113] p-6 sm:p-7">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-violet-500/[.14] blur-3xl" />
      <p className="relative text-sm text-zinc-400">Who&rsquo;s behind this</p>
      <div className="relative mt-4 flex items-center gap-4">
        {mentor.photo
          ? <img src={mentor.photo} alt={mentor.name} width={80} height={80} className="size-20 shrink-0 rounded-2xl object-cover ring-1 ring-white/10" />
          : <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-violet-500/20 text-2xl font-semibold text-violet-100">{initials}</span>}
        <div className="min-w-0">
          <h3 id="mentor-name" className="text-xl font-semibold text-white">{mentor.name}</h3>
          {mentor.title && <p className="mt-0.5 text-[15px] text-zinc-300">{mentor.title}</p>}
          {mentor.linkedin && (
            <a href={mentor.linkedin} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-sky-300 hover:text-sky-200">
              LinkedIn profile <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </div>
      {mentor.bio && <blockquote className="relative mt-5 text-[15px] leading-7 text-zinc-200">{mentor.bio}</blockquote>}
      {mentor.highlights.length > 0 && (
        <ul className="relative mt-5 flex flex-wrap gap-2">
          {mentor.highlights.map((item) => (
            <li key={item} className="rounded-full border border-white/[.1] bg-white/[.03] px-3 py-1 text-sm text-zinc-200">{item}</li>
          ))}
        </ul>
      )}
    </figure>
  );
}

function FinalCta() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-[-.03em] text-white sm:text-5xl">Your next interview is closer than you think.</h2>
        <p className="mt-4 max-w-lg text-lg text-zinc-300">Practise today. It's free.</p>
        <Link href={SIGNUP} className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-violet-500 px-6 text-base font-semibold text-white hover:bg-violet-400">Start preparing free</Link>
      </div>
    </section>
  );
}

function Footer() {
  const socials = Object.entries(siteConfig.social).filter(([, url]) => url);
  return (
    <footer className="border-t border-white/[.06]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Brand />
          <p className="mt-3 text-sm text-zinc-500">{siteConfig.tagline}.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400" aria-label="Footer">
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-white">Contact</a>
          {socials.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="capitalize hover:text-white">{label}</a>)}
        </nav>
      </div>
      <p className="border-t border-white/[.06] px-4 py-5 text-center text-sm text-zinc-600">© {new Date().getFullYear()} {siteConfig.legalName}</p>
    </footer>
  );
}
