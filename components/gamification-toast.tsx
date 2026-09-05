"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { Award, Sparkles, X } from "lucide-react";
import { useAppStore } from "@/lib/store";

const badgeNames: Record<string, string> = {
  "first-master": "First Deployment",
  "quiz-sharpshooter": "Sharp Shooter",
  "streak-seven": "Seven Day Uptime",
  "streak-thirty": "Always On",
  "xp-7500": "Platform Engineer",
  "mock-ace": "Interview Ace",
};

export function GamificationToast() {
  const { latestUnlocks, clearUnlocks } = useAppStore();
  const badge = latestUnlocks[0];

  useEffect(() => {
    if (!badge) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      void confetti({ particleCount: 70, spread: 72, origin: { y: 0.2 }, colors: ["#8b5cf6", "#22d3ee", "#f59e0b"] });
    }
    const timer = window.setTimeout(clearUnlocks, 6000);
    return () => window.clearTimeout(timer);
  }, [badge, clearUnlocks]);

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          className="fixed right-4 top-20 z-[80] w-[calc(100%-32px)] max-w-sm overflow-hidden rounded-2xl border border-amber-400/20 bg-[#111113]/95 p-4 shadow-[0_24px_90px_rgba(245,158,11,.18)] backdrop-blur-xl"
          role="status"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/[.08] via-violet-400/[.05] to-cyan-400/[.04]" />
          <div className="relative flex items-center gap-3">
            <motion.span animate={{ rotateY: [0, 360] }} transition={{ duration: 1.2 }} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-400/10 text-amber-300">
              <Award size={23} />
            </motion.span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[.16em] text-amber-300"><Sparkles size={11} /> Badge unlocked</p>
              <p className="mt-1 truncate text-sm font-semibold">{badgeNames[badge] ?? badge}</p>
              <p className="mt-1 text-[10px] text-zinc-500">Your achievement is now part of your profile.</p>
            </div>
            <button onClick={clearUnlocks} aria-label="Dismiss achievement" className="grid size-8 place-items-center rounded-lg text-zinc-600 hover:bg-white/[.05]"><X size={15} /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
