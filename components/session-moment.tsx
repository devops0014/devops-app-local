"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles, X } from "lucide-react";
import { useState } from "react";

const quotes = [
  ["One step ahead of the interview.", "Every focused practice session turns production knowledge into interview confidence."],
  ["Your next answer starts here.", "Build one clear explanation today and make it unforgettable tomorrow."],
  ["Consistency compounds.", "A few strong questions today can change the direction of your next interview."],
  ["Think like a production engineer.", "Understand the failure, explain the trade-off, and own the solution."],
];

export function WelcomeMoment({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [[title, copy]] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);
  return <AnimatePresence>{open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] grid place-items-center bg-black/65 p-4 backdrop-blur-lg" role="dialog" aria-modal="true" aria-label="Welcome motivation">
    <motion.div initial={{ opacity: 0, y: 18, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .98 }} transition={{ type: "spring", stiffness: 260, damping: 24 }} className="relative w-full max-w-lg overflow-hidden rounded-[30px] border border-violet-400/20 bg-[var(--panel)] p-8 text-center shadow-[0_45px_150px_rgba(76,29,149,.35)] sm:p-10">
      <div className="premium-grid absolute inset-0 opacity-25" /><div className="absolute -top-20 left-1/2 size-52 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl" />
      <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-xl text-zinc-500 hover:bg-white/[.06]"><X size={17} /></button>
      <div className="relative"><span className="mx-auto grid size-16 place-items-center rounded-[22px] border border-cyan-400/20 bg-gradient-to-br from-violet-500/15 to-cyan-400/10 text-cyan-400 shadow-[0_0_55px_rgba(34,211,238,.13)]"><Sparkles size={29} /></span><p className="mt-6 text-[10px] font-semibold uppercase tracking-[.22em] text-violet-400">Welcome to your command centre</p><h2 className="mt-3 text-2xl font-semibold tracking-[-.045em] sm:text-3xl">{title}</h2><p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-zinc-500">{copy}</p><button onClick={onClose} className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-sm font-semibold text-white shadow-[0_16px_45px_rgba(124,58,237,.22)]">Continue preparing <ArrowRight size={16} /></button></div>
    </motion.div>
  </motion.div>}</AnimatePresence>;
}

export function GoodbyeMoment({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <AnimatePresence>{open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[130] grid place-items-center bg-black/72 p-4 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Signed out"><motion.div initial={{ opacity: 0, y: 18, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-md rounded-[28px] border border-emerald-400/20 bg-[var(--panel)] p-9 text-center shadow-[0_40px_120px_rgba(16,185,129,.16)]"><span className="mx-auto grid size-16 place-items-center rounded-[22px] border border-emerald-400/20 bg-emerald-400/[.08] text-emerald-400"><CheckCircle2 size={30} /></span><h2 className="mt-6 text-3xl font-semibold tracking-[-.05em]">See you again!</h2><p className="mt-3 text-sm leading-7 text-zinc-500">Your progress is safe. Come back when you’re ready for the next question.</p><button type="button" onClick={onClose} className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl border border-red-400/30 bg-red-600 font-semibold text-white shadow-[0_14px_40px_rgba(220,38,38,.22)] transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300">Close</button></motion.div></motion.div>}</AnimatePresence>;
}
