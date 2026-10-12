import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Sends one-time codes through the WhatsApp Business Cloud API (Meta) using an
 * approved AUTHENTICATION template with a "Copy code" button.
 *
 * Required environment variables:
 *   WHATSAPP_ACCESS_TOKEN      permanent System User token with whatsapp_business_messaging
 *   WHATSAPP_PHONE_NUMBER_ID   the sender number's ID from WhatsApp Manager
 *   WHATSAPP_OTP_TEMPLATE      approved authentication template name (e.g. "verification_code")
 * Optional:
 *   WHATSAPP_OTP_LANGUAGE      template language code (default "en")
 *   WHATSAPP_GRAPH_VERSION     Graph API version (default "v25.0")
 *   OTP_DEV_MODE=1             local testing only: skip WhatsApp and show the code on screen
 */
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 60;
export const OTP_MAX_PER_HOUR = 5;

export function isWhatsAppConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim()
    && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
    && process.env.WHATSAPP_OTP_TEMPLATE?.trim(),
  );
}

export function isOtpDevMode() {
  return process.env.OTP_DEV_MODE === "1" && !isWhatsAppConfigured();
}

export function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(userId: string, phone: string, code: string) {
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`${userId}:${phone}:${code}:${pepper}`).digest("hex");
}

export function otpMatches(expectedHash: string, userId: string, phone: string, code: string) {
  const actual = Buffer.from(hashOtp(userId, phone, code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function sendWhatsAppOtp(phoneE164: string, code: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN!.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim();
  const version = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v25.0";
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneE164.replace(/^\+/, ""),
      type: "template",
      template: {
        name: process.env.WHATSAPP_OTP_TEMPLATE!.trim(),
        language: { code: process.env.WHATSAPP_OTP_LANGUAGE?.trim() || "en" },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string; code?: number } };
    console.error("WhatsApp OTP send failed", response.status, payload.error);
    // 131026 = recipient cannot receive WhatsApp messages (no WhatsApp on this number).
    if (payload.error?.code === 131026) {
      throw new Error("This number does not appear to be on WhatsApp. Please use your WhatsApp number.");
    }
    throw new Error("We could not send the WhatsApp code right now. Please try again in a minute.");
  }
}
