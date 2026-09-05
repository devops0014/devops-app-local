import { AppShell } from "@/components/app-shell";
import { SubscriptionGate } from "@/components/access-gate";
import { SupabaseSyncProvider } from "@/components/providers/supabase-sync-provider";
import { GamificationToast } from "@/components/gamification-toast";
import { DeviceSessionProvider } from "@/components/providers/device-session-provider";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <SubscriptionGate>
        <SupabaseSyncProvider>
          <DeviceSessionProvider>
            {children}
            <GamificationToast />
          </DeviceSessionProvider>
        </SupabaseSyncProvider>
      </SubscriptionGate>
    </AppShell>
  );
}
