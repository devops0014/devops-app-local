import { createHash } from "node:crypto";

/**
 * Meta Conversions API: tells Meta which ad clicks became *verified* sign-ups,
 * so campaigns optimise for real leads. Uses the same event_id as the browser
 * Pixel event, so Meta counts it once.
 *
 *   NEXT_PUBLIC_META_PIXEL_ID   your Pixel (dataset) ID
 *   META_CAPI_ACCESS_TOKEN      Events Manager → Settings → Conversions API → Generate access token
 *   META_CAPI_TEST_EVENT_CODE   optional, from Events Manager → Test events
 */
const sha256 = (value: string) => createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

export function verifiedSignupEventId(userId: string) {
  return `verified-${userId}`;
}

export async function sendMetaEvent(input: {
  eventName: "CompleteRegistration" | "Lead";
  eventId: string;
  userId: string;
  email?: string | null;
  phone?: string | null;
  sourceUrl?: string;
}) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!pixelId || !token) return;
  const version = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v25.0";
  const userData: Record<string, string[]> = { external_id: [sha256(input.userId)] };
  if (input.email) userData.em = [sha256(input.email)];
  if (input.phone) userData.ph = [sha256(input.phone.replace(/\D/g, ""))];
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: [{
          event_name: input.eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: input.eventId,
          action_source: "website",
          event_source_url: input.sourceUrl ?? process.env.NEXT_PUBLIC_SITE_URL,
          user_data: userData,
        }],
        ...(process.env.META_CAPI_TEST_EVENT_CODE ? { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE } : {}),
      }),
    });
    if (!response.ok) console.error("Meta CAPI failed", response.status, await response.text().catch(() => ""));
  } catch (cause) {
    console.error("Meta CAPI failed", cause);
  }
}
