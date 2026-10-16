import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { blockedSignInMessage } from "@/lib/message-templates";
import { checkRateLimit, rateLimitResponse, requestIdentity } from "@/lib/security/rate-limit";

/**
 * Called by the sign-in page after a failed sign-in, so a student whose account
 * was removed for a wrong number sees why instead of "invalid credentials".
 * Only answers for removals in the last 60 days.
 */
export async function POST(request: Request) {
  const limit = checkRateLimit(`blocked-notice:${requestIdentity(request)}`, 10, 10 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!supabaseAdmin || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ blocked: false });
  // Already signed up again? Then a failed sign-in is just a wrong password.
  const { data: current } = await supabaseAdmin.from("profiles").select("id").eq("email", email).limit(1);
  if (current?.length) return NextResponse.json({ blocked: false });
  const since = new Date(Date.now() - 60 * 24 * 60 * 60_000).toISOString();
  const { data } = await supabaseAdmin.from("blocked_contacts").select("id").eq("email", email).gte("blocked_at", since).limit(1);
  return NextResponse.json(data?.length ? { blocked: true, message: blockedSignInMessage } : { blocked: false });
}
