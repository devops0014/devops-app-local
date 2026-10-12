import { NextResponse } from "next/server";
import { ApiError, requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/leads";
import { checkRateLimit, rateLimitResponse, rejectOversizedJson, requestIdentity } from "@/lib/security/rate-limit";
import {
  OTP_MAX_PER_HOUR, OTP_RESEND_SECONDS, OTP_TTL_MINUTES, generateOtp, hashOtp,
  isOtpDevMode, isWhatsAppConfigured, sendWhatsAppOtp,
} from "@/lib/whatsapp";

export async function POST(request: Request) {
  const limit = checkRateLimit(`otp-send:${requestIdentity(request)}`, 8, 10 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  if (rejectOversizedJson(request, 2_048)) return NextResponse.json({ error: "Request body is too large." }, { status: 413 });

  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => null)) as { phone?: string; consent?: boolean } | null;
    if (!body?.consent) throw new ApiError("Please accept the contact consent to continue.");
    const phone = normalizePhone(String(body.phone ?? ""));
    if (!phone) throw new ApiError("Enter a valid mobile number, e.g. +91 98765 43210.");

    if (!isWhatsAppConfigured() && !isOtpDevMode()) {
      throw new ApiError("WhatsApp verification is not configured on the server yet.", 503);
    }

    const { data: owner } = await supabaseAdmin!.from("profiles")
      .select("id").eq("mobile", phone).not("phone_verified_at", "is", null).neq("id", user.id).maybeSingle();
    if (owner) throw new ApiError("This number is already verified on another account. Sign in with that account instead.", 409);

    const hourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
    const { data: recent } = await supabaseAdmin!.from("phone_otps")
      .select("created_at").eq("user_id", user.id).gte("created_at", hourAgo).order("created_at", { ascending: false });
    if ((recent?.length ?? 0) >= OTP_MAX_PER_HOUR) throw new ApiError("Too many codes requested. Please try again in an hour.", 429);
    const last = recent?.[0]?.created_at ? Date.parse(recent[0].created_at) : 0;
    const wait = Math.ceil((last + OTP_RESEND_SECONDS * 1_000 - Date.now()) / 1_000);
    if (wait > 0) throw new ApiError(`Please wait ${wait}s before requesting another code.`, 429);

    const code = generateOtp();
    const { error } = await supabaseAdmin!.from("phone_otps").insert({
      user_id: user.id,
      phone,
      code_hash: hashOtp(user.id, phone, code),
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
    });
    if (error) throw new ApiError("Could not create a verification code.", 500);

    if (isOtpDevMode()) {
      console.info(`[OTP_DEV_MODE] code for ${phone}: ${code}`);
      return NextResponse.json({ sent: true, phone, resendIn: OTP_RESEND_SECONDS, devCode: code });
    }
    try {
      await sendWhatsAppOtp(phone, code);
    } catch (cause) {
      throw new ApiError(cause instanceof Error ? cause.message : "Could not send the WhatsApp code.", 502);
    }
    return NextResponse.json({ sent: true, phone, resendIn: OTP_RESEND_SECONDS });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send the code." }, { status });
  }
}
