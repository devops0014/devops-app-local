import { NextResponse } from "next/server";
import { extractVerifyToken, handleInboundToken } from "@/lib/phone-verification";
import { sendWhatsAppText, verifyWebhookSignature } from "@/lib/whatsapp";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Meta's one-time webhook verification handshake. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();
  if (
    expected
    && url.searchParams.get("hub.mode") === "subscribe"
    && url.searchParams.get("hub.verify_token") === expected
  ) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

type InboundMessage = { from?: string; type?: string; text?: { body?: string }; button?: { text?: string } };
type WebhookPayload = { entry?: { changes?: { value?: { messages?: InboundMessage[] } }[] }[] };

/** Incoming WhatsApp messages. Inbound messages are not billed by Meta. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  if (!supabaseAdmin) return NextResponse.json({ ok: true });

  let payload: WebhookPayload;
  try { payload = JSON.parse(raw) as WebhookPayload; } catch { return NextResponse.json({ ok: true }); }

  const messages = (payload.entry ?? []).flatMap((entry) => (entry.changes ?? []).flatMap((change) => change.value?.messages ?? []));
  for (const message of messages.slice(0, 20)) {
    const from = message.from?.replace(/\D/g, "");
    const text = message.text?.body ?? message.button?.text ?? "";
    const token = extractVerifyToken(text);
    if (!from || !token) continue;
    try {
      const result = await handleInboundToken(token, from);
      await sendWhatsAppText(from, result.ok
        ? "✅ You're verified! Go back to DevOpsCrack — your free interview prep is unlocked."
        : `⚠️ ${result.error}`);
    } catch (cause) {
      console.error("WhatsApp verification failed", cause);
    }
  }
  // Always 200 so Meta doesn't keep retrying the same delivery.
  return NextResponse.json({ ok: true });
}
