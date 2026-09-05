"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Check, Cog } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { GlowCard } from "./glow-card";
import { LiveTerminal } from "./live-terminal";
import { PIPELINE_STEP_MS, pipelineStages } from "./constants";

export function AnimatedPipeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { margin: "-15% 0px -15% 0px" });
  const reducedMotion = useReducedMotion();
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    if (!inView || reducedMotion) return;
    const timer = window.setInterval(() => setActiveStage((current) => (current + 1) % pipelineStages.length), PIPELINE_STEP_MS);
    return () => window.clearInterval(timer);
  }, [inView, reducedMotion]);

  return (
    <motion.div ref={containerRef} initial={reducedMotion ? false : { opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8, delay: .1 }} className="living-pipeline-panel">
      <div className="pipeline-grid absolute inset-0 opacity-50" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-full border border-white/[.08] bg-black/45 px-3 py-1.5 font-mono text-[9px] text-zinc-500">
          <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" /> PIPELINE_EXECUTION / LIVE
        </div>
        <span className="hidden font-mono text-[7px] text-zinc-700 sm:block">RUN #284 · PROD</span>
      </div>
      <div className="pipeline-stage-grid relative mt-5">
        {pipelineStages.map((stage, index) => <PipelineCard key={stage.name} stage={stage} index={index} active={activeStage === index} complete={index < activeStage} reducedMotion={Boolean(reducedMotion)} />)}
      </div>
      <LiveTerminal activeStage={activeStage} reducedMotion={Boolean(reducedMotion)} />
      <div className="relative mt-3 flex items-center justify-between rounded-xl border border-white/[.06] bg-black/35 px-3 py-2 font-mono text-[7px] text-zinc-700">
        <span>COMMIT</span><span>BUILD</span><span>DEPLOY</span><span>MONITOR</span><span className="text-emerald-300">HEALTHY</span>
      </div>
    </motion.div>
  );
}

function PipelineCard({ stage, index, active, complete, reducedMotion }: { stage: typeof pipelineStages[number]; index: number; active: boolean; complete: boolean; reducedMotion: boolean }) {
  const Icon = stage.icon;
  return (
    <GlowCard active={active} glow={stage.color} className={`pipeline-stage-card pipeline-position-${index}`} interactive>
      {index < pipelineStages.length - 1 && <div className={`pipeline-energy-link ${complete || active ? "is-live" : ""}`} aria-hidden="true"><i /><i /><i /></div>}
      {active && !reducedMotion && <motion.span layoutId="pipeline-cube" transition={{ type: "spring", stiffness: 85, damping: 18 }} className="signature-cube" aria-hidden="true" />}
      <div className="flex items-start justify-between">
        <motion.span animate={active && !reducedMotion ? { scale: [1, 1.08, 1] } : undefined} transition={{ duration: 1.4, repeat: Infinity }} className="grid size-9 place-items-center rounded-xl border border-white/[.08] bg-white/[.04]" style={{ color: stage.color }}>
          {stage.name === "Jenkins" ? <Cog size={17} className={active ? "jenkins-gear" : ""} /> : <Icon size={17} />}
        </motion.span>
        <span className="font-mono text-[7px] tracking-[.14em] text-zinc-700">{stage.phase}</span>
      </div>
      <h3 className="mt-3 text-xs font-semibold">{stage.name}</h3>
      <div className={`mt-2 flex items-center gap-1.5 text-[8px] ${active || complete ? "text-emerald-300" : "text-zinc-600"}`}><span className={`size-1 rounded-full ${active || complete ? "bg-emerald-400" : "bg-zinc-700"}`} />{active ? stage.activeStatus : stage.idleStatus}</div>
      <div className="mt-3 flex gap-2 text-[8px] text-zinc-600"><span>{stage.questions} Qs</span><span>·</span><span>{stage.labs} Labs</span></div>
      <Link href="/practice" className="mt-3 flex items-center gap-1 text-[8px] text-zinc-600 transition hover:text-white">Explore <ArrowRight size={9} /></Link>
      <StageVisualization stage={stage.name} active={active} />
    </GlowCard>
  );
}

function StageVisualization({ stage, active }: { stage: string; active: boolean }) {
  if (stage === "GitHub") return <div className="stage-commit mt-2"><Check size={8} /><span>82f4c1</span></div>;
  if (stage === "Jenkins") return <span className={`stage-progress ${active ? "is-running" : ""}`}><i /></span>;
  if (stage === "Docker") return <div className={`docker-container-viz mt-2 ${active ? "is-building" : ""}`}><i /><i /><i /></div>;
  if (stage === "Kubernetes") return <div className="mt-2 flex gap-1">{[0, 1, 2].map((pod) => <span key={pod} className={`pod-viz ${active ? "is-ready" : ""}`} style={{ animationDelay: `${pod * 140}ms` }} />)}</div>;
  if (stage === "Terraform") return <div className={`terraform-blocks mt-2 ${active ? "is-assembling" : ""}`}><i /><i /><i /></div>;
  if (stage === "Prometheus") return <div className={`metric-wave mt-2 ${active ? "is-live" : ""}`}><i /><i /><i /><i /><i /><i /></div>;
  return <div className={`grafana-health mt-2 ${active ? "is-live" : ""}`}><span><i /></span><b>99.99%</b></div>;
}
