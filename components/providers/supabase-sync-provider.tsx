"use client";

import { useEffect } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { loadLearningState, subscribeToLearningState } from "@/lib/repositories/learning-repository";
import { useAppStore } from "@/lib/store";

export function SupabaseSyncProvider({ children }: { children: React.ReactNode }) {
  const hydrateCloudState = useAppStore((state) => state.hydrateCloudState);
  const setCloudStatus = useAppStore((state) => state.setCloudStatus);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setCloudStatus("demo");
      return;
    }

    let unsubscribeRealtime = () => undefined;
    let connectionVersion = 0;
    let mounted = true;

    const sync = async () => {
      const state = await loadLearningState();
      if (mounted && state) hydrateCloudState(state);
    };

    const connect = async (knownUserId?: string) => {
      const version = ++connectionVersion;
      setCloudStatus("connecting");
      const userId = knownUserId ?? (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        setCloudStatus("offline");
        return;
      }
      await sync();
      if (!mounted || version !== connectionVersion) return;
      unsubscribeRealtime();
      unsubscribeRealtime = subscribeToLearningState(userId, () => void sync());
      setCloudStatus("synced");
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      unsubscribeRealtime();
      queueMicrotask(() => void connect(session?.user.id));
    });

    return () => {
      mounted = false;
      connectionVersion += 1;
      unsubscribeRealtime();
      authListener.subscription.unsubscribe();
    };
  }, [hydrateCloudState, setCloudStatus]);

  return <>{children}</>;
}
