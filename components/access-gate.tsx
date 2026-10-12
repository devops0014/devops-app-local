"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

/**
 * The platform is free for everyone. This gate only makes sure the visitor is
 * signed in so their progress, XP and flashcard reviews can be saved.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
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
          <p className="mt-3 text-xs text-zinc-600">Loading your workspace…</p>
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
