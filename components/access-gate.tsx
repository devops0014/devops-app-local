"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    const verify = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_status, subscription_expires_at")
        .eq("id", sessionData.session.user.id)
        .single();

      const expiresAt = profile?.subscription_expires_at
        ? new Date(profile.subscription_expires_at).getTime()
        : Number.POSITIVE_INFINITY;
      const subscribed =
        ["trialing", "active"].includes(profile?.subscription_status ?? "") &&
        expiresAt > Date.now();

      if (!subscribed) {
        router.replace("/pricing");
        return;
      }
      if (mounted) setReady(true);
    };

    void verify();
    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="grid min-h-[calc(100vh-72px)] place-items-center">
        <div className="text-center">
          <LoaderCircle size={24} className="mx-auto animate-spin text-violet-400" />
          <p className="mt-3 text-xs text-zinc-600">Verifying your subscription…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    const verify = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sessionData.session.user.id)
        .single();
      if (profile?.role !== "admin") {
        router.replace("/dashboard");
        return;
      }
      if (mounted) setReady(true);
    };

    void verify();
    return () => {
      mounted = false;
    };
  }, [router]);

  return ready ? <>{children}</> : null;
}
