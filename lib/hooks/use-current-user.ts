"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { asRole, type Role } from "@/lib/rbac";

export type CurrentUserProfile = {
  id: string;
  email: string;
  name: string;
  mobile: string;
  avatar: string | null;
  role: Role;
  phoneVerified: boolean;
};

export function useCurrentUser() {
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  const refresh = useCallback(async () => {
    if (!supabase) {
      setProfile({
        id: "demo",
        email: "demo@devopscrack.com",
        name: "Demo Student",
        mobile: "",
        avatar: null,
        role: "student",
        phoneVerified: true,
      });
      setLoading(false);
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("name,email,mobile,avatar,role,phone_verified_at")
      .eq("id", auth.user.id)
      .maybeSingle();

    const metadata = auth.user.user_metadata ?? {};
    setProfile({
      id: auth.user.id,
      email: data?.email ?? auth.user.email ?? "",
      name: data?.name ?? metadata.full_name ?? metadata.name ?? auth.user.email?.split("@")[0] ?? "Student",
      mobile: data?.mobile ?? metadata.phone ?? "",
      avatar: data?.avatar ?? metadata.avatar_url ?? metadata.picture ?? null,
      role: asRole(data?.role),
      phoneVerified: Boolean(data?.phone_verified_at),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void refresh());
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => void refresh());
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  return { profile, loading, refresh };
}
