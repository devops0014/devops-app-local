import { randomInt } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isWhatsAppDevMode } from "@/lib/whatsapp";
import { sendMetaEvent, verifiedSignupEventId } from "@/lib/meta-capi";

/**
 * "none" (default): the student types their mobile number and confirms it. No
 *   code, no WhatsApp/SMS setup. Callers catch wrong numbers and block them.
 * "inbound" (free, needs Meta setup): student sends `VERIFY DC-XXXXXXXX` to your number.
 * "otp" (billed by Meta): we send the student a 6-digit template code.
 */
export type VerifyMethod = "none" | "inbound" | "otp";

export const VERIFY_TOKEN_TTL_MINUTES = 15;
const TOKEN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function verifyMethod(): VerifyMethod {
  const value = process.env.PHONE_VERIFY_METHOD?.trim().toLowerCase();
  return value === "otp" || value === "inbound" ? value : "none";
}

/** Was this number reported as wrong by the team? */
export async function isBlockedPhone(phoneE164: string) {
  const { data } = await supabaseAdmin!.from("blocked_contacts").select("id").eq("phone", phoneE164).limit(1);
  return Boolean(data?.length);
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
export async function completePhoneVerification(
  userId: string,
  phoneE164: string,
  consentAt: string,
  method: "none" | "whatsapp" | "otp" = "whatsapp",
): Promise<CompleteResult> {
  if (await isBlockedPhone(phoneE164)) {
    return { ok: false, error: "This number was reported as incorrect by our team. Please use your own mobile number." };
  }
  const { data: owner } = await supabaseAdmin!.from("profiles")
    .select("id").eq("mobile", phoneE164).not("phone_verified_at", "is", null).neq("id", userId).maybeSingle();
  if (owner) return { ok: false, error: "This mobile number is already linked to another account." };

  const now = new Date().toISOString();
  const base = {
    mobile: phoneE164,
    phone_verified_at: now,
    marketing_consent: true,
    marketing_consent_at: consentAt,
    updated_at: now,
  };
  const save = (fields: Record<string, unknown>) =>
    supabaseAdmin!.from("profiles").update(fields).eq("id", userId).select("id");
  let { data: saved, error } = await save({ ...base, phone_verification_method: method });
  // Database not migrated to 2026101601 yet (no phone_verification_method column)? Save without it.
  if (error && (error.code === "42703" || error.code === "PGRST204")) {
    console.warn("profiles.phone_verification_method is missing — run supabase/migrations/2026101601_phone_confirm_and_blocking.sql");
    ({ data: saved, error } = await save(base));
  }
  if (error) {
    if (error.code === "23505") return { ok: false, error: "This mobile number is already linked to another account." };
    console.error("Saving phone number failed", error);
    return { ok: false, error: `Could not save your number (${error.code ?? "database error"}: ${error.message}).` };
  }
  if (!saved?.length) {
    // No row was updated: either the profile row is missing, or the server is not
    // using the service-role key (then row-level security silently blocks the update).
    const { data: authUser } = await supabaseAdmin!.auth.admin.getUserById(userId);
    const { data: created, error: insertError } = await supabaseAdmin!.from("profiles")
      .upsert({ id: userId, email: authUser.user?.email ?? "", ...base }, { onConflict: "id" }).select("id");
    if (insertError || !created?.length) {
      console.error("Saving phone number updated no rows. Check SUPABASE_SERVICE_ROLE_KEY in .env.local is the service_role key, not the anon key.", insertError);
      return { ok: false, error: "Your number couldn't be saved because of a server setting. If you run this site, check SUPABASE_SERVICE_ROLE_KEY in .env.local (it must be the service_role key) and restart." };
    }
  }
  await supabaseAdmin!.from("leads").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  const { data: authUser } = await supabaseAdmin!.auth.admin.getUserById(userId);
  await supabaseAdmin!.auth.admin.updateUserById(userId, {
    user_metadata: { ...(authUser.user?.user_metadata ?? {}), phone: phoneE164, mobile: phoneE164 },
  });
  await sendMetaEvent({
    eventName: "CompleteRegistration",
    eventId: verifiedSignupEventId(userId),
    userId,
    email: authUser.user?.email,
    phone: phoneE164,
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

/** "STOP" on WhatsApp: withdraw contact consent for the account that owns this number. */
export async function handleInboundStop(fromWaId: string) {
  const phone = `+${fromWaId.replace(/\D/g, "")}`;
  const { data: profile } = await supabaseAdmin!.from("profiles")
    .select("id,role").eq("mobile", phone).not("phone_verified_at", "is", null).maybeSingle();
  if (!profile) return false;
  const now = new Date().toISOString();
  await supabaseAdmin!.from("profiles").update({ marketing_consent: false, marketing_consent_at: now }).eq("id", profile.id);
  if (profile.role === "student") {
    await supabaseAdmin!.from("leads").upsert(
      { user_id: profile.id, do_not_contact: true, do_not_contact_at: now, follow_up_at: null },
      { onConflict: "user_id" },
    );
    await supabaseAdmin!.from("lead_activity").insert({
      user_id: profile.id, author_id: profile.id, kind: "opt_out", body: "Replied STOP on WhatsApp — do not contact",
    });
  }
  return true;
}

export function isStopMessage(text: string) {
  return /^\s*(stop|unsubscribe|stop all|opt ?out)\s*[.!]?\s*$/i.test(text);
}
