import { randomInt } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isWhatsAppDevMode } from "@/lib/whatsapp";

/**
 * "inbound" (default, free): student sends `VERIFY DC-XXXXXXXX` to your number.
 * "otp" (fallback, billed by Meta): we send the student a 6-digit template code.
 */
export type VerifyMethod = "inbound" | "otp";

export const VERIFY_TOKEN_TTL_MINUTES = 15;
const TOKEN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function verifyMethod(): VerifyMethod {
  return process.env.PHONE_VERIFY_METHOD?.trim().toLowerCase() === "otp" ? "otp" : "inbound";
}

/** Business number students message, digits only (e.g. 919876543210). */
export function businessNumber() {
  return (process.env.WHATSAPP_BUSINESS_NUMBER ?? "").replace(/\D/g, "");
}

export function isInboundConfigured() {
  return Boolean(businessNumber() && process.env.WHATSAPP_APP_SECRET?.trim() && process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim());
}

export function inboundDevMode() {
  return isWhatsAppDevMode() && !isInboundConfigured();
}

export function generateVerifyToken() {
  let value = "";
  for (let index = 0; index < 8; index += 1) value += TOKEN_ALPHABET[randomInt(0, TOKEN_ALPHABET.length)];
  return `DC-${value}`;
}

/** Finds `DC-XXXXXXXX` in a message, tolerating case and stray spaces. */
export function extractVerifyToken(text: string) {
  const match = text.toUpperCase().match(/DC\s*-?\s*([A-Z0-9]{8})\b/);
  return match ? `DC-${match[1]}` : null;
}

export function verifyMessageText(token: string) {
  return `VERIFY ${token}`;
}

export type CompleteResult = { ok: true; phone: string } | { ok: false; error: string };

/**
 * Marks a student's phone as verified and opens their lead record.
 * Shared by the WhatsApp webhook, the dev simulator and the OTP fallback.
 */
export async function completePhoneVerification(userId: string, phoneE164: string, consentAt: string): Promise<CompleteResult> {
  const { data: owner } = await supabaseAdmin!.from("profiles")
    .select("id").eq("mobile", phoneE164).not("phone_verified_at", "is", null).neq("id", userId).maybeSingle();
  if (owner) return { ok: false, error: "This WhatsApp number is already linked to another account." };

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin!.from("profiles").update({
    mobile: phoneE164,
    phone_verified_at: now,
    marketing_consent: true,
    marketing_consent_at: consentAt,
    updated_at: now,
  }).eq("id", userId);
  if (error) {
    return { ok: false, error: error.code === "23505" ? "This WhatsApp number is already linked to another account." : "Could not save your verified number." };
  }
  await supabaseAdmin!.from("leads").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  const { data: authUser } = await supabaseAdmin!.auth.admin.getUserById(userId);
  await supabaseAdmin!.auth.admin.updateUserById(userId, {
    user_metadata: { ...(authUser.user?.user_metadata ?? {}), phone: phoneE164, mobile: phoneE164 },
  });
  return { ok: true, phone: phoneE164 };
}

/** Matches an incoming WhatsApp message to a pending request and verifies it. */
export async function handleInboundToken(token: string, fromWaId: string) {
  const phone = `+${fromWaId.replace(/\D/g, "")}`;
  const { data: request } = await supabaseAdmin!.from("phone_verification_requests")
    .select("id,user_id,status,expires_at,consent_at").eq("token", token).maybeSingle();
  if (!request) return { ok: false as const, error: "We couldn't find that code. Open the website and tap \"Verify on WhatsApp\" again." };
  if (request.status === "verified") return { ok: true as const, phone, already: true };
  if (Date.parse(request.expires_at) < Date.now()) {
    await supabaseAdmin!.from("phone_verification_requests").update({ status: "failed", error: "Code expired" }).eq("id", request.id);
    return { ok: false as const, error: "That code has expired. Go back to the website and tap \"Verify on WhatsApp\" again." };
  }

  const result = await completePhoneVerification(request.user_id, phone, request.consent_at);
  await supabaseAdmin!.from("phone_verification_requests").update(result.ok
    ? { status: "verified", phone, verified_at: new Date().toISOString(), error: null }
    : { status: "failed", phone, error: result.error }).eq("id", request.id);
  return result.ok ? { ok: true as const, phone, already: false } : result;
}
