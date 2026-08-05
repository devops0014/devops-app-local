"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  hover = false,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
}) {
  const Component = hover ? motion.div : "div";
  const props = hover
    ? { whileHover: { y: -3 }, transition: { duration: 0.18 } }
    : {};
  return (
    <Component
      className={cn(
        "premium-card rounded-2xl border border-white/[0.07] bg-[var(--panel)] shadow-[0_16px_50px_rgba(0,0,0,.12)]",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "violet" | "cyan" | "green" | "amber" | "rose";
  className?: string;
}) {
  const tones = {
    neutral: "border-white/10 bg-white/[.045] text-zinc-400",
    violet: "border-violet-400/20 bg-violet-400/10 text-violet-300",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    rose: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}) {
  const variants = {
    primary:
      "bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-[0_10px_30px_rgba(124,58,237,.24)] hover:brightness-110",
    secondary:
      "border border-white/10 bg-white/[.055] text-zinc-100 hover:bg-white/[.09]",
    ghost: "text-zinc-400 hover:bg-white/[.06] hover:text-white",
    danger: "border border-rose-400/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/15",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs rounded-lg",
    md: "h-10 px-4 text-sm rounded-xl",
    lg: "h-12 px-5 text-sm rounded-xl",
    icon: "size-10 rounded-xl",
  };
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all disabled:cursor-not-allowed disabled:opacity-45",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function ProgressBar({
  value,
  className,
  color = "from-violet-500 to-cyan-400",
}: {
  value: number;
  className?: string;
  color?: string;
}) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-white/[.07]", className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className={cn("h-full rounded-full bg-gradient-to-r", color)}
      />
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.18em] text-violet-400">
            {eyebrow}
          </p>
        )}
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
