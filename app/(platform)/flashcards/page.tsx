"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flame,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Badge, Button, Card, ProgressBar } from "@/components/ui";
import { useContentCatalog } from "@/lib/hooks/use-content-catalog";
import type { Question } from "@/lib/types";
import { difficultyTone } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

function SwipeCard({
  question,
  revealed,
  onReveal,
  onDecision,
}: {
  question: Question;
  revealed: boolean;
  onReveal: () => void;
  onDecision: (known: boolean) => void;
}) {
  const x = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-10, 10]);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [4, -4]), { stiffness: 180, damping: 22 });
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-5, 5]), { stiffness: 180, damping: 22 });
  const knowOpacity = useTransform(x, [40, 140], [0, 1]);
  const reviseOpacity = useTransform(x, [-140, -40], [1, 0]);

  return (
    <motion.div
      style={{ x, rotate, rotateX: prefersReducedMotion ? 0 : rotateX, rotateY: prefersReducedMotion ? 0 : rotateY, transformPerspective: 1100 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.75}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120) onDecision(true);
        if (info.offset.x < -120) onDecision(false);
      }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
        pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
      }}
      onPointerLeave={() => { pointerX.set(0); pointerY.set(0); }}
      whileTap={{ cursor: "grabbing" }}
      className="absolute inset-0 cursor-grab touch-pan-y"
    >
      <Card className="relative flex h-full flex-col overflow-hidden border-white/[.09] p-6 shadow-[0_45px_120px_rgba(0,0,0,.52),0_0_55px_rgba(124,58,237,.06)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,.13),transparent_48%)]" />
        <motion.div style={{ opacity: knowOpacity }} className="absolute right-6 top-6 z-10 rotate-6 rounded-lg border-2 border-emerald-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
          Know it
        </motion.div>
        <motion.div style={{ opacity: reviseOpacity }} className="absolute left-6 top-6 z-10 -rotate-6 rounded-lg border-2 border-rose-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-300">
          Revise
        </motion.div>
        <div className="flex items-center gap-2">
          <Badge>{question.category}</Badge>
          <Badge tone={difficultyTone(question.difficulty)}>{question.difficulty}</Badge>
          <span className="ml-auto text-[9px] text-zinc-700">Drag to answer</span>
        </div>
        <div className="flex flex-1 flex-col justify-center py-8 text-center">
          {!revealed ? (
            <>
              <p className="mx-auto max-w-lg text-xl font-medium leading-8 tracking-[-.025em] sm:text-2xl sm:leading-9">{question.question}</p>
              <button onClick={onReveal} className="mx-auto mt-8 flex items-center gap-2 rounded-xl border border-violet-400/15 bg-violet-400/[.07] px-4 py-2.5 text-xs font-medium text-violet-200 hover:bg-violet-400/10">
                <Eye size={15} /> Reveal answer
              </button>
            </>
          ) : (
            <motion.div initial={{ opacity: 0, rotateY: -90, scale: 0.96 }} animate={{ opacity: 1, rotateY: 0, scale: 1 }} transition={{ type: "spring", stiffness: 150, damping: 18 }} className="mx-auto max-h-[330px] max-w-xl overflow-y-auto text-left">
              <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[.15em] text-violet-400">Expert answer</p>
              <ReactMarkdown components={{
                p: ({ children }) => <p className="mb-4 text-sm leading-7 text-zinc-300">{children}</p>,
                ol: ({ children }) => <ol className="ml-5 list-decimal space-y-2 text-sm leading-6 text-zinc-300">{children}</ol>,
                code: ({ children }) => <code className="rounded bg-cyan-400/[.07] px-1 py-0.5 font-mono text-[11px] text-cyan-200">{children}</code>,
              }}>{question.answer}</ReactMarkdown>
            </motion.div>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 border-t border-white/[.06] pt-5 text-[10px] text-zinc-600">
          <span className="flex items-center gap-1.5"><ChevronLeft size={13} className="text-rose-400" /> Swipe left to revise</span>
          <span className="h-3 w-px bg-white/[.08]" />
          <span className="flex items-center gap-1.5">Swipe right if you know <ChevronRight size={13} className="text-emerald-400" /></span>
        </div>
      </Card>
    </motion.div>
  );
}

export default function FlashcardsPage() {
  const { questions } = useContentCatalog();
  const reviews = useAppStore((state) => state.flashcardReviews);
  const recordReview = useAppStore((state) => state.recordFlashcardReview);
  const [sessionStartedAt] = useState(() => Date.now());
  const deck = useMemo(() => {
    return questions
      .slice()
      .sort((a, b) => {
        const aReview = reviews[a.id];
        const bReview = reviews[b.id];
        const aDue = !aReview || new Date(aReview.nextReviewAt).getTime() <= sessionStartedAt ? 0 : 1;
        const bDue = !bReview || new Date(bReview.nextReviewAt).getTime() <= sessionStartedAt ? 0 : 1;
        return aDue - bDue;
      })
      .slice(0, 10);
  }, [questions, reviews, sessionStartedAt]);
  const dueCount = useMemo(() => Object.values(reviews).filter((review) => new Date(review.nextReviewAt).getTime() <= sessionStartedAt).length, [reviews, sessionStartedAt]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState(0);
  const [revision, setRevision] = useState(0);
  const complete = index >= deck.length;

  const decide = (didKnow: boolean) => {
    recordReview(deck[index].id, didKnow);
    if (didKnow) setKnown((value) => value + 1);
    else setRevision((value) => value + 1);
    window.setTimeout(() => {
      setIndex((value) => value + 1);
      setRevealed(false);
    }, 150);
  };

  const restart = () => {
    setIndex(0);
    setKnown(0);
    setRevision(0);
    setRevealed(false);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.17em] text-violet-400">Active recall</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Daily flashcards</h1>
          <p className="mt-2 text-xs text-zinc-500">A focused mixed-topic deck selected from your revision list.</p>
          <p className="mt-2 text-[10px] text-cyan-400">{dueCount} cards due now · spaced repetition active</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.03] px-3 py-2">
          <Flame size={15} className="text-amber-300" />
          <span className="text-[10px] text-zinc-500">Daily deck</span>
          <span className="text-xs font-semibold">{Math.min(index, deck.length)}/{deck.length}</span>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-3">
          <ProgressBar value={(Math.min(index, deck.length) / deck.length) * 100} className="flex-1" />
          <span className="text-[10px] text-zinc-600">{Math.round((Math.min(index, deck.length) / deck.length) * 100)}%</span>
        </div>
      </div>

      {!complete ? (
        <div className="mx-auto mt-7 max-w-3xl">
          <div className="relative h-[560px] sm:h-[520px]">
            <div className="absolute inset-x-10 bottom-[-22px] top-6 rounded-3xl border border-violet-400/[.05] bg-[#0c0c10] shadow-[0_30px_60px_rgba(0,0,0,.35)]" />
            <div className="absolute inset-x-5 bottom-[-12px] top-3 rounded-3xl border border-white/[.04] bg-[#101012]" />
            <div className="absolute inset-x-2 bottom-[-5px] top-1 rounded-3xl border border-white/[.05] bg-[#121214]" />
            <AnimatePresence mode="popLayout">
              <SwipeCard
                key={deck[index].id}
                question={deck[index]}
                revealed={revealed}
                onReveal={() => setRevealed(true)}
                onDecision={decide}
              />
            </AnimatePresence>
          </div>
          <div className="mt-7 flex items-center justify-center gap-5">
            <button onClick={() => decide(false)} className="grid size-14 place-items-center rounded-full border border-rose-400/20 bg-rose-400/[.07] text-rose-300 shadow-lg transition hover:scale-105 hover:bg-rose-400/10" aria-label="Need revision"><X size={22} /></button>
            <button onClick={() => setRevealed(!revealed)} className="grid size-11 place-items-center rounded-full border border-white/[.08] bg-white/[.035] text-zinc-500 hover:text-white" aria-label="Flip card"><RotateCcw size={17} /></button>
            <button onClick={() => decide(true)} className="grid size-14 place-items-center rounded-full border border-emerald-400/20 bg-emerald-400/[.07] text-emerald-300 shadow-lg transition hover:scale-105 hover:bg-emerald-400/10" aria-label="Know it"><Check size={22} /></button>
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto mt-10 max-w-2xl">
          <Card className="overflow-hidden text-center">
            <div className="relative bg-gradient-to-b from-violet-500/12 to-transparent px-6 py-10">
              <div className="premium-grid absolute inset-0 opacity-30" />
              <span className="relative mx-auto grid size-16 place-items-center rounded-[22px] bg-violet-400/10 text-violet-300"><Trophy size={28} /></span>
              <h2 className="relative mt-5 text-2xl font-semibold tracking-tight">Deck complete!</h2>
              <p className="relative mt-2 text-xs text-zinc-500">You reviewed {deck.length} cards and earned {known * 20} XP.</p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-white/[.06]">
              <div className="bg-[var(--panel)] p-6">
                <p className="text-2xl font-semibold text-emerald-300">{known}</p>
                <p className="mt-1 text-[10px] text-zinc-600">Know it</p>
              </div>
              <div className="bg-[var(--panel)] p-6">
                <p className="text-2xl font-semibold text-rose-300">{revision}</p>
                <p className="mt-1 text-[10px] text-zinc-600">Need revision</p>
              </div>
            </div>
            <div className="p-6">
              <div className="rounded-xl border border-violet-400/10 bg-violet-400/[.04] p-3 text-[10px] leading-5 text-zinc-500">
                <Sparkles size={14} className="mx-auto mb-2 text-violet-300" />
                {revision} missed cards return tomorrow. Known cards now follow a widening 2–30 day review interval.
              </div>
              <Button onClick={restart} className="mt-5"><RotateCcw size={14} /> Practice again</Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
