"use client";

import { AnimatePresence, motion } from "framer-motion";
import { TerminalSquare } from "lucide-react";
import { pipelineStages } from "./constants";

export function LiveTerminal({ activeStage, reducedMotion }: { activeStage: number; reducedMotion: boolean }) {
  const stage = pipelineStages[activeStage];
  return (
    <div className="pipeline-terminal" aria-live="polite" aria-label="Live pipeline terminal">
      <div className="flex items-center gap-2 border-b border-white/[.06] px-3 py-2">
        <span className="size-1.5 rounded-full bg-rose-400/70" />
        <span className="size-1.5 rounded-full bg-amber-400/70" />
        <span className="size-1.5 rounded-full bg-emerald-400/70" />
        <TerminalSquare size={11} className="ml-2 text-zinc-600" />
        <span className="font-mono text-[7px] text-zinc-700">production@devopscrack</span>
      </div>
      <div className="min-h-[56px] px-3 py-2.5 font-mono text-[8px] leading-5">
        <AnimatePresence mode="wait">
          <motion.div key={stage.name} initial={reducedMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .25 }}>
            <p className="text-zinc-500"><span className="text-cyan-400">$</span> {stage.command}<span className="terminal-cursor" /></p>
            <p className="text-emerald-300">{stage.output}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
