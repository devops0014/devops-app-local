import { NextResponse } from "next/server";
import { ApiError, requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, rejectOversizedJson, requestIdentity } from "@/lib/security/rate-limit";
import { OTP_MAX_ATTEMPTS, otpMatches } from "@/lib/whatsapp";
import { completePhoneVerification } from "@/lib/phone-verification";

export async function POST(request: Request) {
  const limit = checkRateLimit(`otp-verify:${requestIdentity(request)}`, 20, 10 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  if (rejectOversizedJson(request, 1_024)) return NextResponse.json({ error: "Request body is too large." }, { status: 413 });

  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => null)) as { code?: string } | null;
    const code = String(body?.code ?? "").trim();
    if (!/^\d{6}$/.test(code)) throw new ApiError("Enter the 6-digit code from WhatsApp.");

    const { data: otp } = await supabaseAdmin!.from("phone_otps")
      .select("id,phone,code_hash,attempts,expires_at")
      .eq("user_id", user.id).is("consumed_at", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!otp) throw new ApiError("No active code. Request a new one.", 404);
    if (Date.parse(otp.expires_at) < Date.now()) throw new ApiError("This code has expired. Request a new one.", 410);
    if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new ApiError("Too many wrong attempts. Request a new code.", 429);

    if (!otpMatches(otp.code_hash, user.id, otp.phone, code)) {
      await supabaseAdmin!.from("phone_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
      throw new ApiError(left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong attempts. Request a new code.", 400);
    }

    const now = new Date().toISOString();
    await supabaseAdmin!.from("phone_otps").update({ consumed_at: now }).eq("id", otp.id);
    const result = await completePhoneVerification(user.id, otp.phone, now, "otp");
    if (!result.ok) throw new ApiError(result.error, 409);

    return NextResponse.json({ verified: true, phone: otp.phone });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verification failed." }, { status });
  }
}
