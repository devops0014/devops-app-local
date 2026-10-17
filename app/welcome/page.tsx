"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, MapPin, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { Badge, Button, Skeleton } from "@/components/ui";
import { experienceLabels, goalLabels } from "@/lib/leads";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { interestTopic } from "@/lib/attribution";

/** Three quick questions after WhatsApp verification. Helps the team (and the roadmap) fit the student. */
export default function WelcomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [experience, setExperience] = useState("");
  const [goal, setGoal] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const next = () => {
    const value = new URLSearchParams(window.location.search).get("returnTo");
    const safe = value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
    // Picked a tool on the home page? Start them on that topic.
    const topic = interestTopic();
    return safe === "/dashboard" && topic ? `/practice?category=${encodeURIComponent(topic)}` : safe;
  };

  useEffect(() => {
    if (!supabase) { router.replace("/dashboard"); return; }
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/login"); return; }
      const { data: profile } = await supabase.from("profiles")
        .select("role,onboarded_at,experience_level,career_goal,job_title,city").eq("id", data.session.user.id).maybeSingle();
      if (profile?.role !== "student" || profile.onboarded_at) { router.replace(next()); return; }
      setExperience(profile.experience_level ?? "");
      setGoal(profile.career_goal ?? "");
      setJobTitle(profile.job_title ?? "");
      setCity(profile.city ?? "");
      setReady(true);
    })();
  }, [router]);

  const save = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const { data } = await supabase!.auth.getSession();
      const response = await fetch("/api/me/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not save.");
      window.sessionStorage.removeItem("devopscrack-welcome-shown");
      router.replace(next());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save.");
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save({ experience, goal, jobTitle, city });
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#09090b] p-5 text-white">
      <div className="premium-grid absolute inset-0 opacity-50" />
      <div className="absolute left-1/2 top-[-160px] size-[520px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[120px]" />
      <div className="relative w-full max-w-lg">
        <div className="mb-8"><Brand /></div>
        <div className="rounded-[26px] border border-white/[.08] bg-[#111214]/90 p-6 shadow-[0_40px_120px_rgba(0,0,0,.5)] backdrop-blur-xl sm:p-8">
          {!ready ? (
            <div role="status" aria-label="Loading" className="space-y-4"><Skeleton className="h-6 w-40 rounded-full" /><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-2/3" /><Skeleton className="mt-6 h-12 w-full rounded-xl" /><Skeleton className="h-12 w-full rounded-xl" /></div>
          ) : (
            <form onSubmit={submit}>
              <Badge tone="violet"><Sparkles size={12} className="mr-1" /> Last step · 15 seconds</Badge>
              <h1 className="mt-5 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Tell us about you</h1>
              <p className="mt-2 text-sm leading-6 text-zinc-400">We'll suggest the right topics to start with.</p>

              <fieldset className="mt-6">
                <legend className="mb-2 text-sm font-medium text-zinc-300">Your experience</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(experienceLabels).map(([key, label]) => (
                    <Choice key={key} active={experience === key} onClick={() => setExperience(key)}>{label}</Choice>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-5">
                <legend className="mb-2 text-sm font-medium text-zinc-300">Your goal</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(goalLabels).map(([key, label]) => (
                    <Choice key={key} active={goal === key} onClick={() => setGoal(key)}>{label}</Choice>
                  ))}
                </div>
              </fieldset>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">Current role <span className="font-normal text-zinc-500">(optional)</span></span>
                  <span className="auth-field"><BriefcaseBusiness size={17} /><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} maxLength={80} placeholder="e.g. Support engineer" /></span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">City <span className="font-normal text-zinc-500">(optional)</span></span>
                  <span className="auth-field"><MapPin size={17} /><input value={city} onChange={(event) => setCity(event.target.value)} maxLength={60} placeholder="e.g. Hyderabad" /></span>
                </label>
              </div>

              {error && <p className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/[.06] px-3 py-2.5 text-sm text-rose-300">{error}</p>}
              <Button type="submit" size="lg" disabled={busy || !experience || !goal} className="mt-6 w-full">
                {busy ? "Saving…" : "Start preparing"} {!busy && <ArrowRight size={16} />}
              </Button>
              <button type="button" disabled={busy} onClick={() => void save({ skip: true })} className="mt-3 w-full text-center text-sm text-zinc-500 hover:text-zinc-300">Skip for now</button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn(
      "min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition",
      active ? "border-violet-400/60 bg-violet-400/[.12] text-white" : "border-white/[.09] bg-white/[.02] text-zinc-400 hover:border-white/[.18] hover:text-zinc-200",
    )}>
      {children}
    </button>
  );
}
