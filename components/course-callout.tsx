"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, BadgeCheck, GraduationCap, LoaderCircle, PhoneCall } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { siteConfig } from "@/lib/site-config";
import { supabase } from "@/lib/supabase/client";
import { trackMetaEvent } from "@/components/providers/analytics-provider";
import { cn } from "@/lib/utils";

async function call(method: "GET" | "POST", body?: unknown) {
  const { data } = await supabase!.auth.getSession();
  const response = await fetch("/api/me/callback", {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({})) as { requestedAt?: string | null; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Something went wrong.");
  return payload.requestedAt ?? null;
}

/**
 * Promotes the paid course to students. "Request a callback" flags them as a
 * hot lead in the sales dashboard. Hidden for team accounts.
 */
export function CourseCallout({ context, headline, compact = false }: { context: string; headline?: string; compact?: boolean }) {
  const { profile } = useCurrentUser();
  const [requestedAt, setRequestedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isStudent = profile?.role === "student" && Boolean(supabase);

  useEffect(() => {
    if (!isStudent) return;
    void call("GET").then(setRequestedAt).catch(() => undefined);
  }, [isStudent]);

  if (!isStudent) return null;

  const request = async () => {
    setBusy(true);
    setError("");
    try {
      setRequestedAt(await call("POST", { context }));
      trackMetaEvent("Lead", { content_name: "callback_request", content_category: context });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send your request.");
    } finally {
      setBusy(false);
    }
  };

  const recent = requestedAt && Date.now() - Date.parse(requestedAt) < 7 * 24 * 60 * 60_000;

  return (
    <section className={cn(
      "relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[.14] via-[var(--panel)] to-cyan-500/[.06]",
      compact ? "p-5" : "p-5 sm:p-6",
    )}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-400/15 text-violet-200"><GraduationCap size={22} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-violet-300">{siteConfig.course.name}</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-.02em] text-white">{headline ?? "Want structured, mentor-led preparation?"}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-300">{siteConfig.course.pitch}</p>
          {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {recent ? (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[.08] px-4 py-2.5 text-sm text-emerald-200"><BadgeCheck size={16} /> We'll call you soon</p>
          ) : (
            <button onClick={() => void request()} disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-violet-50 disabled:opacity-60">
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <PhoneCall size={16} />} Request a callback
            </button>
          )}
          {siteConfig.course.url && (
            <a href={siteConfig.course.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-violet-200 hover:text-white">See the course <ArrowUpRight size={14} /></a>
          )}
        </div>
      </div>
    </section>
  );
}
