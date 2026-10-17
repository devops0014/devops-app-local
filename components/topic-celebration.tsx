"use client";

import { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { PartyPopper, Timer, X } from "lucide-react";

export type CompletedTopic = { name: string; slug: string; total: number };

/** Shown when a student masters every question in a topic. */
export function TopicCelebration({ topic, onClose }: { topic: CompletedTopic | null; onClose: () => void }) {
  useEffect(() => {
    if (!topic) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      void confetti({ particleCount: 160, spread: 90, startVelocity: 38, origin: { y: 0.35 }, colors: ["#8b5cf6", "#34d399", "#22d3ee", "#fbbf24"] });
    }
  }, [topic]);

  return (
    <AnimatePresence>
      {topic && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="topic-done-title"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-md rounded-[26px] border border-emerald-400/25 bg-[#111214] p-7 text-center shadow-[0_40px_120px_rgba(16,185,129,.18)]"
          >
            <button onClick={onClose} className="absolute right-4 top-4 grid size-9 place-items-center rounded-xl text-zinc-400 hover:bg-white/[.06]" aria-label="Close"><X size={18} /></button>
            <span className="mx-auto grid size-16 place-items-center rounded-[22px] bg-emerald-400/10 text-emerald-300"><PartyPopper size={30} /></span>
            <h2 id="topic-done-title" className="mt-5 text-2xl font-semibold tracking-[-.02em] text-white">You mastered {topic.name}!</h2>
            <p className="mt-2 text-[15px] leading-7 text-zinc-300">All {topic.total} questions done. Lock it in with a quick quiz, then pick your next topic.</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Link href="/quiz" onClick={onClose} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400"><Timer size={16} /> Take a quiz</Link>
              <Link href="/practice" onClick={onClose} className="inline-flex h-11 items-center justify-center rounded-xl border border-white/[.12] text-sm text-zinc-100 hover:border-white/25">Next topic</Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
