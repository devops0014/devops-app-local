import { NextResponse } from "next/server";
import { ApiError, requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, requestIdentity } from "@/lib/security/rate-limit";

/** Student taps "Request a callback" — flags them as a hot lead for the sales team. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const { data } = await supabaseAdmin!.from("leads").select("callback_requested_at").eq("user_id", user.id).maybeSingle();
    return NextResponse.json({ requestedAt: data?.callback_requested_at ?? null });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status });
  }
}

export async function POST(request: Request) {
  const limit = checkRateLimit(`callback:${requestIdentity(request)}`, 5, 60 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => null)) as { context?: string } | null;
    const { data: profile } = await supabaseAdmin!.from("profiles").select("role,phone_verified_at").eq("id", user.id).maybeSingle();
    if (profile?.role !== "student") throw new ApiError("Only students can request a callback.", 400);
    if (!profile.phone_verified_at) throw new ApiError("Verify your WhatsApp number first.", 400);
    const now = new Date().toISOString();
    const { data: existing } = await supabaseAdmin!.from("leads").select("callback_requested_at").eq("user_id", user.id).maybeSingle();
    if (existing?.callback_requested_at && Date.now() - Date.parse(existing.callback_requested_at) < 24 * 60 * 60_000) {
      return NextResponse.json({ requestedAt: existing.callback_requested_at });
    }
    const { error } = await supabaseAdmin!.from("leads").upsert(
      { user_id: user.id, callback_requested_at: now, do_not_contact: false },
      { onConflict: "user_id" },
    );
    if (error) throw new ApiError("Could not send your request.", 500);
    await supabaseAdmin!.from("lead_activity").insert({
      user_id: user.id, author_id: user.id, kind: "callback_request",
      body: `Requested a callback${body?.context ? ` (${String(body.context).slice(0, 60)})` : ""}`,
    });
    return NextResponse.json({ requestedAt: now });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status });
  }
}
