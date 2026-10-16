import { NextResponse } from "next/server";
import { ApiError, requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/leads";
import { handleInboundToken, inboundDevMode } from "@/lib/phone-verification";

/**
 * LOCAL TESTING ONLY. Pretends the student sent their code from `phone`.
 * Disabled unless WHATSAPP_DEV_MODE=1 and the real webhook is not configured.
 */
export async function POST(request: Request) {
  try {
    if (!inboundDevMode()) throw new ApiError("Not available.", 404);
    const user = await requireUser(request);
    const body = (await request.json().catch(() => null)) as { phone?: string } | null;
    const phone = normalizePhone(String(body?.phone ?? ""));
    if (!phone) throw new ApiError("Enter a valid number to simulate.");
    const { data: pending } = await supabaseAdmin!.from("phone_verification_requests")
      .select("token").eq("user_id", user.id).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!pending) throw new ApiError("Tap \"Verify on WhatsApp\" first.", 400);
    console.info(`[WHATSAPP_DEV_MODE] simulated inbound ${pending.token} from ${phone}`);
    const result = await handleInboundToken(pending.token, phone);
    if (!result.ok) throw new ApiError(result.error, 409);
    return NextResponse.json({ verified: true, phone: result.phone });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Simulation failed." }, { status });
  }
}
