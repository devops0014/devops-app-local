"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRef, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { motionTokens } from "./constants";

type GlowCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  glow?: string;
  active?: boolean;
  interactive?: boolean;
};

export function GlowCard({ children, className = "", glow = "#60a5fa", active = false, interactive = true, ...props }: GlowCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || reducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateX = ((y / rect.height) - .5) * -4;
    const rotateY = ((x / rect.width) - .5) * 4;
    ref.current.style.setProperty("--spot-x", `${x}px`);
    ref.current.style.setProperty("--spot-y", `${y}px`);
    ref.current.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  };

  const reset = () => {
    if (!ref.current) return;
    ref.current.style.transform = "";
  };

  return (
    <motion.div
      ref={ref}
      layout
      transition={motionTokens.spring}
      onPointerMove={move}
      onPointerLeave={reset}
      className={`living-glow-card ${active ? "is-active" : ""} ${className}`}
      style={{ "--glow-color": glow } as CSSProperties}
      {...props}
    >
      {children}
    </motion.div>
  );
}
