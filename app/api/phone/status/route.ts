import { NextResponse } from "next/server";
import { ApiError, requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { businessNumber, inboundDevMode, verifyMethod } from "@/lib/phone-verification";
import { isOtpDevMode } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Polled by /verify-phone while the student sends their WhatsApp message. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const method = verifyMethod();
    const [{ data: profile }, { data: latest }] = await Promise.all([
      supabaseAdmin!.from("profiles").select("mobile,phone_verified_at").eq("id", user.id).maybeSingle(),
      supabaseAdmin!.from("phone_verification_requests")
        .select("token,status,error,expires_at").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    return NextResponse.json({
      method,
      verified: Boolean(profile?.phone_verified_at),
      phone: profile?.phone_verified_at ? profile.mobile : null,
      prefill: profile?.mobile ?? (typeof user.user_metadata?.mobile === "string" ? user.user_metadata.mobile : null),
      businessNumber: businessNumber() || null,
      devMode: method === "otp" ? isOtpDevMode() : method === "inbound" ? inboundDevMode() : false,
      request: latest ? { token: latest.token, status: latest.status, error: latest.error, expiresAt: latest.expires_at } : null,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load status." }, { status });
  }
}
