"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Layers, Sparkles, Timer } from "lucide-react";
import { CategoryMark, brandColors } from "@/components/category-logo-rail";
import type { ContentCategory } from "@/lib/hooks/use-content-catalog";
import { interestTopic } from "@/lib/attribution";
import { topicLabel } from "@/lib/leads";

/**
 * First visit: instead of a dashboard full of zeros, give one clear next step
 * (the tool they picked on the home page) plus a few quick ways in.
 */
export function StartHere({ firstName, categories, loading }: { firstName: string; categories: ContentCategory[]; loading: boolean }) {
  const reduced = useReducedMotion();
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => { setPicked(interestTopic()); }, []);

  const sorted = [...categories].sort((a, b) => b.total - a.total);
  const primary = (picked && categories.find((category) => category.slug === picked)) || sorted[0] || null;
  const primaryName = primary?.name ?? topicLabel(picked) ?? "DevOps";
  const others = sorted.filter((category) => category.slug !== primary?.slug).slice(0, 8);
  const accent = (primary && brandColors[primary.slug]) || "#8b5cf6";

  return (
    <section className="relative" aria-labelledby="start-here-title">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[26px] border border-white/[.09] bg-[#111113] p-6 sm:p-8"
        style={{ boxShadow: `0 30px 90px -40px ${accent}66` }}
      >
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full blur-3xl" style={{ background: `${accent}26` }} />
        <p className="relative inline-flex items-center gap-2 rounded-full bg-white/[.06] px-3 py-1 text-sm text-zinc-200"><Sparkles size={14} className="text-amber-300" /> You&rsquo;re all set, {firstName}</p>
        <div className="relative mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h1 id="start-here-title" className="max-w-xl text-3xl font-semibold leading-tight tracking-[-.03em] text-white sm:text-4xl">
              Start with {primaryName}
            </h1>
            <p className="mt-3 max-w-lg text-base leading-7 text-zinc-300">
              {primary
                ? `${primary.total} interview questions with clear answers. Mark what you know, and we'll keep track of the rest.`
                : "Interview questions with clear answers. Mark what you know, and we'll keep track of the rest."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={primary ? `/practice?category=${encodeURIComponent(primary.slug)}` : "/practice"}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold text-white transition hover:brightness-110"
                style={{ background: accent }}
              >
                Open {primaryName} questions <ArrowRight size={17} />
              </Link>
              <Link href="/quiz" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/[.14] px-5 text-base text-zinc-100 hover:border-white/30">
                <Timer size={17} /> Take a quick quiz
              </Link>
            </div>
          </div>
          {primary && (
            <span className="hidden size-28 place-items-center rounded-[28px] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,.35)] lg:grid [&_img]:size-16 [&_svg]:size-14 [&_svg]:text-zinc-800">
              <CategoryMark category={primary} />
            </span>
          )}
        </div>
      </motion.div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/flashcards" className="group flex items-center gap-4 rounded-2xl border border-white/[.08] bg-[var(--panel)] p-4 transition hover:border-white/[.18]">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><Layers size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium text-zinc-100">Revise with flashcards</span>
            <span className="block text-sm text-zinc-400">Five minutes before an interview</span>
          </span>
          <ArrowRight size={17} className="text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
        </Link>
        <Link href="/quiz" className="group flex items-center gap-4 rounded-2xl border border-white/[.08] bg-[var(--panel)] p-4 transition hover:border-white/[.18]">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-400/10 text-sky-300"><Timer size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium text-zinc-100">Test yourself</span>
            <span className="block text-sm text-zinc-400">Timed MCQs with explanations</span>
          </span>
          <ArrowRight size={17} className="text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
        </Link>
      </div>

      {(loading || others.length > 0) && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-100">Or pick another topic</h2>
          <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {loading && !others.length
              ? Array.from({ length: 8 }, (_, index) => <li key={index} className="h-[88px] animate-pulse rounded-2xl bg-white/[.04]" />)
              : others.map((category) => (
                <li key={category.slug}>
                  <Link href={`/practice?category=${encodeURIComponent(category.slug)}`} className="flex h-full items-center gap-3 rounded-2xl border border-white/[.08] bg-[var(--panel)] p-3.5 transition hover:-translate-y-0.5 hover:border-white/[.18]">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white p-2 [&_img]:size-6 [&_svg]:size-5 [&_svg]:text-zinc-800">
                      <CategoryMark category={category} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-zinc-100">{category.name}</span>
                      <span className="block text-xs text-zinc-500">{category.total} questions</span>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}
