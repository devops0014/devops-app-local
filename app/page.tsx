"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck, BookOpenCheck, Check, ChevronDown, GraduationCap, Layers, MessageCircle, Timer, X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { siteConfig } from "@/lib/site-config";
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

const topics = ["Linux", "Git", "Docker", "Kubernetes", "Helm", "Terraform", "Ansible", "AWS", "Jenkins", "GitHub Actions", "ArgoCD", "Prometheus", "Grafana", "Nginx"];

const faqs = [
  { q: "Is it really free?", a: "Yes. The question bank, quizzes and flashcards are free, with no card and no trial that runs out." },
  { q: "Why do I verify with WhatsApp?", a: "It keeps out fake accounts and takes about ten seconds: tap a button, press Send in WhatsApp, and you're in. It doesn't cost you anything." },
  { q: "Will someone call me?", a: `Only if you agree when you sign up. Our team may reach out about your preparation and the ${siteConfig.course.name}. You can switch this off any time in Account settings, or reply STOP on WhatsApp.` },
  { q: "Who is it for?", a: "Freshers going for their first DevOps role, engineers switching from support, testing or development, and working DevOps engineers preparing for their next move." },
];

export default function LandingPage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-[#09090b] text-zinc-100">
      <Header />
      <Hero />
      <Topics />
      <Tools />
      <Steps />
      <Course />
      <Faq />
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
          <a href="#tools" className="hover:text-white">What you get</a>
          <a href="#how" className="hover:text-white">How it works</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
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
            <a href="#try" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/[.12] px-6 text-base text-zinc-200 transition hover:border-white/25 lg:hidden">
              Try a question first
            </a>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
            <MessageCircle size={15} className="text-emerald-400" /> Sign up with email or Google · verify on WhatsApp in 10 seconds
          </p>
        </div>
        <motion.div id="try" initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="scroll-mt-24">
          <TryQuestion />
        </motion.div>
      </div>
    </section>
  );
}

/** The hero: answer a real interview question right on the page. */
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

function Topics() {
  return (
    <section className="border-b border-white/[.06] py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-base font-medium text-zinc-300">Every topic interviewers ask about</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {topics.map((topic) => (
            <li key={topic} className="rounded-full border border-white/[.09] px-3.5 py-1.5 text-sm text-zinc-300">{topic}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Tools() {
  const tools = [
    {
      icon: BookOpenCheck, name: "Question bank",
      copy: "Questions grouped by tool and difficulty, each with a clear answer. Mark what you've mastered, bookmark what to revise and add your own notes.",
      preview: <PreviewRow left="What's the difference between a Deployment and a StatefulSet?" right="Mastered" tone="emerald" />,
    },
    {
      icon: Timer, name: "Quizzes",
      copy: "Timed and classic quizzes across one topic or many. Get your score and a review of every answer, earn XP and keep your streak going.",
      preview: <PreviewRow left="Kubernetes · 20 questions · 14 min" right="17/20" tone="violet" />,
    },
    {
      icon: Layers, name: "Flashcards",
      copy: "Flip through cards before an interview. Anything you don't know comes back sooner, so revision time goes where you need it.",
      preview: <PreviewRow left="What does terraform plan -out do?" right="Again tomorrow" tone="amber" />,
    },
  ];
  return (
    <section id="tools" className="scroll-mt-20 border-b border-white/[.06] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="max-w-xl text-3xl font-semibold tracking-[-.03em] text-white sm:text-4xl">Three ways to prepare, all free</h2>
        <div className="mt-10 divide-y divide-white/[.07] border-y border-white/[.07]">
          {tools.map((tool) => (
            <div key={tool.name} className="grid gap-4 py-7 md:grid-cols-[220px_1fr_1fr] md:items-center md:gap-8">
              <h3 className="flex items-center gap-3 text-xl font-semibold text-white"><tool.icon size={22} className="text-violet-300" /> {tool.name}</h3>
              <p className="text-[15px] leading-7 text-zinc-300">{tool.copy}</p>
              {tool.preview}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PreviewRow({ left, right, tone }: { left: string; right: string; tone: "emerald" | "violet" | "amber" }) {
  const tones = { emerald: "text-emerald-300 bg-emerald-400/10", violet: "text-violet-200 bg-violet-400/10", amber: "text-amber-200 bg-amber-400/10" };
  return (
    <div aria-hidden className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-[#111113] px-4 py-3">
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">{left}</span>
      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", tones[tone])}>{right}</span>
    </div>
  );
}

function Steps() {
  const steps = [
    { title: "Create your account", copy: "Email and password, or one tap with Google." },
    { title: "Verify on WhatsApp", copy: "Tap the button and press Send. Takes about ten seconds." },
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
  return (
    <section className="border-b border-white/[.06] py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-[auto_1fr] md:items-start md:gap-8">
        <span className="grid size-14 place-items-center rounded-2xl bg-violet-400/10 text-violet-200"><GraduationCap size={26} /></span>
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
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-20 border-b border-white/[.06] py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-[-.03em] text-white sm:text-4xl">Questions</h2>
        <div className="mt-8 divide-y divide-white/[.08] border-y border-white/[.08]">
          {faqs.map((item, index) => {
            const isOpen = open === index;
            return (
              <div key={item.q}>
                <button onClick={() => setOpen(isOpen ? null : index)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-medium text-white">
                  {item.q}
                  <ChevronDown size={20} className={cn("shrink-0 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && <p className="pb-5 text-[15px] leading-7 text-zinc-300">{item.a}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
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
