import { NextResponse } from "next/server";
import { ApiError, requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, rejectOversizedJson, requestIdentity } from "@/lib/security/rate-limit";
import {
  VERIFY_TOKEN_TTL_MINUTES, businessNumber, generateVerifyToken, inboundDevMode, isInboundConfigured, verifyMessageText,
} from "@/lib/phone-verification";

/** Issues (or re-uses) a short code the student sends to our WhatsApp number. */
export async function POST(request: Request) {
  const limit = checkRateLimit(`phone-start:${requestIdentity(request)}`, 15, 10 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  if (rejectOversizedJson(request, 1_024)) return NextResponse.json({ error: "Request body is too large." }, { status: 413 });

  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => null)) as { consent?: boolean } | null;
    if (!body?.consent) throw new ApiError("Please accept the contact consent to continue.");
    const devMode = inboundDevMode();
    if (!isInboundConfigured() && !devMode) throw new ApiError("WhatsApp verification is not configured on the server yet.", 503);

    const nowIso = new Date().toISOString();
    const { data: existing } = await supabaseAdmin!.from("phone_verification_requests")
      .select("token,expires_at").eq("user_id", user.id).eq("status", "pending").gt("expires_at", nowIso)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    let token = existing?.token;
    let expiresAt = existing?.expires_at;
    if (!token) {
      expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MINUTES * 60_000).toISOString();
      for (let attempt = 0; attempt < 3 && !token; attempt += 1) {
        const candidate = generateVerifyToken();
        const { error } = await supabaseAdmin!.from("phone_verification_requests").insert({
          user_id: user.id, token: candidate, consent_at: nowIso, expires_at: expiresAt,
        });
        if (!error) token = candidate;
        else if (error.code !== "23505") throw new ApiError("Could not start verification.", 500);
      }
      if (!token) throw new ApiError("Could not start verification. Please try again.", 500);
    }

    const number = businessNumber();
    const message = verifyMessageText(token);
    return NextResponse.json({
      token,
      message,
      expiresAt,
      businessNumber: number || null,
      waLink: number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null,
      devMode,
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start verification." }, { status });
  }
}
