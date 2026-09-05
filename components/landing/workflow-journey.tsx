"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { Check, ChevronRight, CircleEllipsis } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GlowCard } from "./glow-card";
import { WORKFLOW_STEP_MS, workflowStages } from "./constants";

export function WorkflowJourney() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px -20% 0px" });
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!inView || reducedMotion) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % workflowStages.length), WORKFLOW_STEP_MS);
    return () => window.clearInterval(timer);
  }, [inView, reducedMotion]);

  return (
    <div ref={ref} className="workflow-journey-grid relative mt-14">
      <div className="workflow-energy-track" aria-hidden="true" />
      {workflowStages.map((item, index) => {
        const Icon = item.icon;
        const complete = index < active;
        const current = index === active;
        return (
          <GlowCard key={item.title} glow={item.color} active={current} className={`workflow-card ${complete ? "is-complete" : ""}`} interactive>
            {current && !reducedMotion && <motion.span layoutId="workflow-orb" transition={{ type: "spring", stiffness: 70, damping: 17 }} className="workflow-orb" aria-hidden="true" />}
            <div className="flex items-center justify-between">
              <motion.span animate={current && !reducedMotion ? { scale: [1, 1.07, 1] } : undefined} transition={{ duration: 1.8, repeat: Infinity }} className="grid size-11 place-items-center rounded-2xl border bg-black/30" style={{ color: item.color, borderColor: `${item.color}35` }}><Icon size={20} /></motion.span>
              <span className="font-mono text-[9px] text-zinc-700">{item.step}</span>
            </div>
            <h3 className="mt-8 text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-[11px] leading-5 text-zinc-500">{item.copy}</p>
            <div className="mt-5 flex flex-wrap gap-1.5">{item.tags.map((tag) => <span key={tag} className="rounded-lg border border-white/[.06] bg-black/25 px-2 py-1 text-[8px] text-zinc-600">{tag}</span>)}</div>
            <JourneyVisualization stage={index} active={current} complete={complete} />
            {index < workflowStages.length - 1 && <ChevronRight className="absolute -right-[19px] top-[64px] hidden text-zinc-700 lg:block" size={18} />}
          </GlowCard>
        );
      })}
    </div>
  );
}

function JourneyVisualization({ stage, active, complete }: { stage: number; active: boolean; complete: boolean }) {
  if (stage === 0) return <div className={`journey-book ${active ? "is-open" : ""}`}><i /><i /><span /></div>;
  if (stage === 1) return <div className="journey-counter"><strong>{active ? "24" : "00"}</strong><span>questions</span></div>;
  if (stage === 2) return <div className={`journey-thinking ${active ? "is-thinking" : ""}`}><CircleEllipsis size={14} /><i /><i /><i /></div>;
  if (stage === 3) return <div className={`journey-document ${active ? "is-scanning" : ""}`}><i /><i /><span>KEYWORDS</span></div>;
  return <div className={`journey-offer ${active ? "is-celebrating" : ""}`}><span>{complete ? <Check size={10} /> : "OFFER"}</span><i /><i /><i /></div>;
}
