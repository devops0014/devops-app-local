"use client";

import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export function SpatialCard({
  children,
  className,
  glow = "violet",
}: {
  children: React.ReactNode;
  className?: string;
  glow?: "violet" | "cyan" | "amber" | "emerald";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);
  const rotateX = useSpring(rawRotateX, { stiffness: 180, damping: 22 });
  const rotateY = useSpring(rawRotateY, { stiffness: 180, damping: 22 });
  const background = useMotionTemplate`radial-gradient(420px circle at ${glowX}% ${glowY}%, var(--spatial-glow), transparent 46%)`;

  const colors = {
    violet: "rgba(139,92,246,.18)",
    cyan: "rgba(34,211,238,.16)",
    amber: "rgba(245,158,11,.15)",
    emerald: "rgba(52,211,153,.14)",
  };

  return (
    <motion.div
      ref={ref}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        transformStyle: "preserve-3d",
        "--spatial-glow": colors[glow],
      } as React.CSSProperties}
      onPointerMove={(event) => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        rawRotateX.set((0.5 - py) * 5);
        rawRotateY.set((px - 0.5) * 7);
        glowX.set(px * 100);
        glowY.set(py * 100);
      }}
      onPointerLeave={() => {
        rawRotateX.set(0);
        rawRotateY.set(0);
        glowX.set(50);
        glowY.set(50);
      }}
      className={cn(
        "spatial-card relative overflow-hidden rounded-[22px] border border-white/[.075] bg-[#101014]/90 shadow-[0_22px_80px_rgba(0,0,0,.24)]",
        className,
      )}
    >
      <motion.div
        aria-hidden
        style={{ background }}
        className="pointer-events-none absolute inset-0 opacity-80"
      />
      <div className="relative h-full" style={{ transform: "translateZ(18px)" }}>
        {children}
      </div>
    </motion.div>
  );
}

export function OrbitalProgress({
  value,
  color = "#8b5cf6",
  size = 64,
  label,
}: {
  value: number;
  color?: string;
  size?: number;
  label?: string;
}) {
  return (
    <div
      className="orbital-progress relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      aria-label={`${label ?? "Progress"}: ${value}%`}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${color} ${value * 3.6}deg, rgba(255,255,255,.065) 0deg)`,
          boxShadow: `0 0 26px ${color}22`,
        }}
      />
      <div className="absolute inset-[5px] rounded-full border border-white/[.06] bg-[#101014]" />
      <div className="absolute inset-[1px] animate-[spin_8s_linear_infinite] rounded-full border border-transparent border-t-white/20 border-r-white/5" />
      <span className="relative text-[10px] font-semibold">{value}%</span>
    </div>
  );
}
