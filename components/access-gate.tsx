"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { asRole, can, isStaff, type Permission } from "@/lib/rbac";

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
      // Students must confirm their mobile number once before using the
      // platform. Team members (sales/admin/super admin) skip this step.
      const userId = sessionData.session.user.id;
      let { data: profile, error } = await supabase
        .from("profiles")
        .select("role, phone_verified_at, onboarded_at")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        // Database not migrated yet (no onboarding column): don't block anyone.
        const fallback = await supabase.from("profiles").select("role, phone_verified_at").eq("id", userId).maybeSingle();
        profile = fallback.data ? { ...fallback.data, onboarded_at: "skip" } : null;
        error = fallback.error;
      }
      if (!isStaff(asRole(profile?.role)) && !profile?.phone_verified_at) {
        router.replace(`/verify-phone?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }
      // One-time quick questions after verification.
      if (asRole(profile?.role) === "student" && !profile?.onboarded_at) {
        router.replace(`/welcome?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }
      // The sales team's home is the leads dashboard.
      if (asRole(profile?.role) === "sales" && pathname === "/dashboard") {
        router.replace("/leads");
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
        <div role="status" aria-label="Loading your workspace" className="w-full max-w-[1100px] space-y-5 self-start px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/** Shows children only when the signed-in user's role grants `permission`. */
export function RoleGate({ permission, children }: { permission: Permission; children: React.ReactNode }) {
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
      if (!can(asRole(profile?.role), permission)) {
        router.replace("/dashboard");
        return;
      }
      if (mounted) setReady(true);
    };

    void verify();
    return () => {
      mounted = false;
    };
  }, [permission, router]);

  return ready ? <>{children}</> : null;
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  return <RoleGate permission="content.manage">{children}</RoleGate>;
}
