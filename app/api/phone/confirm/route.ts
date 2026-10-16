import { NextResponse } from "next/server";
import { ApiError, requireUser } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/leads";
import { completePhoneVerification, verifyMethod } from "@/lib/phone-verification";
import { checkRateLimit, rateLimitResponse, rejectOversizedJson, requestIdentity } from "@/lib/security/rate-limit";

/**
 * PHONE_VERIFY_METHOD=none: the student types their mobile number and agrees to
 * be contacted. No code is sent; the sales team catches wrong numbers on the
 * first call and can block the account.
 */
export async function POST(request: Request) {
  const limit = checkRateLimit(`phone-confirm:${requestIdentity(request)}`, 10, 10 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit);
  if (rejectOversizedJson(request, 1_024)) return NextResponse.json({ error: "Request body is too large." }, { status: 413 });

  try {
    if (verifyMethod() !== "none") throw new ApiError("Please verify your number using the steps on screen.", 400);
    const user = await requireUser(request);
    const body = (await request.json().catch(() => null)) as { phone?: string; consent?: boolean } | null;
    if (!body?.consent) throw new ApiError("Please accept the contact consent to continue.");
    const phone = normalizePhone(String(body.phone ?? ""));
    if (!phone) throw new ApiError("Enter a valid 10-digit mobile number, e.g. 98765 43210.");
    const result = await completePhoneVerification(user.id, phone, new Date().toISOString(), "none");
    if (!result.ok) throw new ApiError(result.error, 409);
    return NextResponse.json({ confirmed: true, phone: result.phone });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save your number." }, { status });
  }
}
