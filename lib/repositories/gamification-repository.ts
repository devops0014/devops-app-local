import { supabase } from "@/lib/supabase/client";
import type { GamificationEventType, GamificationSnapshot } from "@/lib/gamification";

async function authHeaders() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ? { authorization: `Bearer ${data.session.access_token}` } : null;
}

export async function awardGamificationEvent(
  eventType: GamificationEventType,
  eventKey: string,
  metadata: Record<string, unknown> = {},
) {
  const headers = await authHeaders();
  if (!headers) return null;
  const response = await fetch("/api/gamification/event", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ eventType, eventKey, metadata }),
  });
  if (!response.ok) return null;
  return response.json() as Promise<GamificationSnapshot>;
}

export async function loadLeaderboard(period: "weekly" | "monthly" | "all") {
  const headers = await authHeaders();
  if (!headers) return null;
  const response = await fetch(`/api/gamification/leaderboard?period=${period}`, { headers });
  if (!response.ok) return null;
  return response.json() as Promise<{
    leaders: Array<{
      rank: number;
      id: string;
      name: string;
      xp: number;
      streak: number;
      levelName: string;
      initials: string;
      you: boolean;
    }>;
  }>;
}
