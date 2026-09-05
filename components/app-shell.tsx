"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity,
  BarChart3,
  ChevronRight,
  CircleHelp,
  Gamepad2,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  X,
  Zap,
  Cloud,
  CreditCard,
  Award,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Brand } from "./brand";
import { ProgressBar } from "./ui";
import { categories, questions } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { levelProgress, nextLevelForXp } from "@/lib/gamification";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { AccountMenu } from "@/components/account-menu";
import { NotificationCenter } from "@/components/notification-center";
import { supabase } from "@/lib/supabase/client";
import { GoodbyeMoment, WelcomeMoment } from "@/components/session-moment";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/practice", label: "Question Bank", icon: CircleHelp },
  { href: "/roadmap", label: "Learning Roadmap", icon: Map },
  { href: "/quiz", label: "Quiz Mode", icon: Zap },
  { href: "/flashcards", label: "Flashcards", icon: Gamepad2 },
  { href: "/mock-interview", label: "Mock Interview", icon: GraduationCap },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/achievements", label: "Achievements", icon: Award },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

const mobileItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/practice", label: "Practice", icon: CircleHelp },
  { href: "/analytics", label: "Stats", icon: Activity },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [goodbyeOpen, setGoodbyeOpen] = useState(false);
  const { profile, refresh } = useCurrentUser();
  const { theme, setTheme, commandOpen, setCommandOpen, xp, level, levelName, cloudStatus } = useAppStore();
  const nextLevel = nextLevelForXp(xp);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    if (window.sessionStorage.getItem("devopscrack-welcome-shown")) return;
    window.sessionStorage.setItem("devopscrack-welcome-shown", "true");
    const timer = window.setTimeout(() => setWelcomeOpen(true), 450);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandOpen, setCommandOpen]);

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return questions.slice(0, 5);
    return questions
      .filter(
        (question) =>
          question.question.toLowerCase().includes(term) ||
          question.category.toLowerCase().includes(term) ||
          question.tags.some((tag) => tag.includes(term)),
      )
      .slice(0, 7);
  }, [query]);

  const navigateToQuestion = (id: string) => {
    setCommandOpen(false);
    setQuery("");
    router.push(`/practice?question=${id}`);
  };

  const signOut = async () => {
    setGoodbyeOpen(true);
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const sessionId = window.sessionStorage.getItem("devopscrack-session-id");
      if (data.session && sessionId) await fetch("/api/sessions", { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ sessionId }) }).catch(() => undefined);
      await supabase.auth.signOut({ scope: "local" });
    }
    window.sessionStorage.removeItem("devopscrack-session-id");
    window.sessionStorage.removeItem("devopscrack-welcome-shown");
  };

  const closeGoodbye = () => {
    setGoodbyeOpen(false);
    window.location.replace("/");
  };

  return (
    <div className="app-shell min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[244px] border-r border-white/[.07] bg-[#0c0c0e] lg:flex lg:flex-col">
        <div className="flex h-[72px] items-center px-5">
          <Brand />
        </div>

        <div className="px-3">
          <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[.18em] text-zinc-600">
            Workspace
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-white/[.075] text-white"
                      : "text-zinc-500 hover:bg-white/[.035] hover:text-zinc-200",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute -left-3 h-5 w-0.5 rounded-r-full bg-violet-400"
                    />
                  )}
                  <item.icon
                    size={17}
                    className={active ? "text-violet-400" : "text-zinc-600 group-hover:text-zinc-400"}
                  />
                  {item.label}
                  {item.label === "Leaderboard" && (
                    <span className="ml-auto rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[9px] text-amber-300">
                      NEW
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-3">
          <div className="mb-3 rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/12 to-cyan-500/[.04] p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Sparkles size={14} className="text-violet-400" />
                Level {level}
              </div>
              <span className="text-[10px] text-zinc-500">{xp.toLocaleString()} XP</span>
            </div>
            <p className="mt-2 text-[11px] text-zinc-400">{levelName}</p>
            <ProgressBar value={levelProgress(xp)} className="mt-2.5" />
            <p className="mt-2 text-[9px] text-zinc-600">{Math.max(0, nextLevel.minXp - xp).toLocaleString()} XP to {nextLevel.name}</p>
          </div>
          {profile?.role === "admin" && <Link
              href="/admin"
              className="flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] text-zinc-500 hover:bg-white/[.04] hover:text-zinc-200"
            >
              <ShieldCheck size={17} />
              Admin Panel
            </Link>}
          <button
            onClick={signOut}
            className="flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] text-zinc-500 hover:bg-white/[.04] hover:text-zinc-200"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 h-[72px] border-b border-white/[.07] bg-[color-mix(in_srgb,var(--background)_82%,transparent)] backdrop-blur-xl lg:left-[244px]">
        <div className="flex h-full items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid size-10 place-items-center rounded-xl text-zinc-400 hover:bg-white/[.06] lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="lg:hidden">
            <Brand compact />
          </div>
          <button
            onClick={() => setCommandOpen(true)}
            className="ml-auto flex h-9 min-w-0 items-center gap-2 rounded-xl border border-white/[.075] bg-white/[.035] px-3 text-xs text-zinc-500 transition-colors hover:border-white/[.12] hover:text-zinc-300 sm:w-64 lg:ml-0"
          >
            <Search size={15} />
            <span className="hidden sm:inline">Search questions...</span>
            <kbd className="ml-auto hidden rounded-md border border-white/[.08] bg-white/[.04] px-1.5 py-0.5 font-mono text-[9px] text-zinc-600 sm:inline">
              ⌘ K
            </kbd>
          </button>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <div aria-live="polite" aria-label={`Cloud status: ${cloudStatus}`} className={`hidden items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[8px] uppercase tracking-wider md:flex ${
              cloudStatus === "synced"
                ? "border-emerald-400/10 bg-emerald-400/[.04] text-emerald-300"
                : cloudStatus === "connecting"
                  ? "border-cyan-400/10 bg-cyan-400/[.04] text-cyan-300"
                  : "border-white/[.06] bg-white/[.025] text-zinc-600"
            }`}>
              <Cloud size={11} />
              {cloudStatus === "synced" ? "Live sync" : cloudStatus === "connecting" ? "Connecting" : cloudStatus === "demo" ? "Demo data" : "Offline"}
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="grid size-9 place-items-center rounded-xl text-zinc-500 hover:bg-white/[.06] hover:text-zinc-200"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <NotificationCenter />
            <div className="mx-1 hidden h-5 w-px bg-white/[.08] sm:block" />
            <AccountMenu profile={profile} onUpdated={refresh} onSignOut={signOut} />
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="min-h-screen pb-24 pt-[72px] lg:ml-[244px] lg:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-white/[.08] bg-[#101012]/95 p-1.5 shadow-2xl backdrop-blur-2xl lg:hidden">
        <div className="grid grid-cols-4">
          {mobileItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-medium",
                  active ? "bg-white/[.07] text-violet-300" : "text-zinc-600",
                )}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <WelcomeMoment open={welcomeOpen} onClose={() => setWelcomeOpen(false)} />
      <GoodbyeMoment open={goodbyeOpen} onClose={closeGoodbye} />

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 left-0 z-50 w-[82vw] max-w-[300px] border-r border-white/10 bg-[#0c0c0e] p-4 lg:hidden"
            >
              <div className="flex items-center justify-between">
                <Brand />
                <button onClick={() => setMobileOpen(false)} className="grid size-9 place-items-center rounded-xl text-zinc-500 hover:bg-white/[.06]">
                  <X size={19} />
                </button>
              </div>
              <nav className="mt-8 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-xl px-3 text-sm",
                      pathname === item.href ? "bg-white/[.07] text-white" : "text-zinc-500",
                    )}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <Dialog.Root open={commandOpen} onOpenChange={setCommandOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-[14%] z-[80] w-[calc(100%-24px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#111113] shadow-[0_30px_100px_rgba(0,0,0,.55)]">
            <Dialog.Title className="sr-only">Search questions</Dialog.Title>
            <div className="flex h-14 items-center gap-3 border-b border-white/[.08] px-4">
              <Search size={18} className="text-zinc-500" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search 1,857 expert questions..."
                className="h-full flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600"
              />
              <kbd className="rounded-md border border-white/[.08] px-1.5 py-0.5 text-[9px] text-zinc-600">ESC</kbd>
            </div>
            <div className="max-h-[390px] overflow-y-auto p-2">
              <p className="px-2 pb-2 pt-1 text-[9px] font-semibold uppercase tracking-[.16em] text-zinc-600">
                {query ? "Search results" : "Recommended for you"}
              </p>
              {searchResults.map((question) => (
                <button
                  key={question.id}
                  onClick={() => navigateToQuestion(question.id)}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/[.055]"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300">
                    <CircleHelp size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-zinc-200">{question.question}</span>
                    <span className="mt-1 block text-[10px] text-zinc-600">
                      {question.category} · {question.difficulty}
                    </span>
                  </span>
                  <ChevronRight size={15} className="ml-auto shrink-0 text-zinc-700 group-hover:text-violet-400" />
                </button>
              ))}
              {!searchResults.length && (
                <div className="grid place-items-center px-6 py-14 text-center">
                  <Search size={28} className="text-zinc-700" />
                  <p className="mt-3 text-sm text-zinc-400">No questions found</p>
                  <p className="mt-1 text-xs text-zinc-600">Try a category, tool, or company name.</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-white/[.07] px-4 py-2.5 text-[9px] text-zinc-600">
              <span>Search by topic, company, or keyword</span>
              <span>{categories.length} categories</span>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
