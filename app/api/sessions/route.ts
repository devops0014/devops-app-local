import { NextResponse } from "next/server";
import { PaymentApiError, requirePaymentUser, supabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, requestIdentity } from "@/lib/security/rate-limit";

function safe(value: unknown, max = 80) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET(request: Request) {
  try {
    const user = await requirePaymentUser(request);
    const { data, error } = await supabaseAdmin!.from("user_sessions")
      .select("id,device_name,browser,os,country,city,device_fingerprint,last_active,created_at,is_active")
      .eq("user_id", user.id).eq("is_active", true).order("last_active", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ sessions: data ?? [] });
  } catch (error) {
    const status = error instanceof PaymentApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load devices." }, { status });
  }
}

export async function POST(request: Request) {
  const limit = checkRateLimit(`device:${requestIdentity(request)}`, 20);
  if (!limit.allowed) return rateLimitResponse(limit);
  try {
    const user = await requirePaymentUser(request);
    const body = await request.json() as Record<string, unknown>;
    const fingerprint = safe(body.fingerprint, 128);
    if (!/^[a-f0-9]{64}$/.test(fingerprint)) return NextResponse.json({ error: "Invalid device fingerprint." }, { status: 400 });
    const { data: active } = await supabaseAdmin!.from("user_sessions")
      .select("id,device_name,browser,os,device_fingerprint,last_active,created_at")
      .eq("user_id", user.id).eq("is_active", true).gt("expires_at", new Date().toISOString())
      .order("last_active", { ascending: false });
    const existing = active?.find((session) => session.device_fingerprint === fingerprint);
    if (!existing && (active?.length ?? 0) >= 2) {
      return NextResponse.json({ error: "Maximum devices reached.", sessions: active }, { status: 409 });
    }
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const { data, error } = await supabaseAdmin!.from("user_sessions").upsert({
      user_id: user.id,
      device_name: safe(body.deviceName) || "Unknown device",
      browser: safe(body.browser) || "Browser",
      os: safe(body.os) || "Unknown OS",
      device_fingerprint: fingerprint,
      ip_address: forwarded || null,
      country: safe(request.headers.get("x-vercel-ip-country"), 64) || null,
      city: safe(request.headers.get("x-vercel-ip-city"), 64) || null,
      last_active: now.toISOString(),
      expires_at: expires.toISOString(),
      is_active: true,
      presence_status: "online",
      presence_updated_at: now.toISOString(),
      revoked_at: null,
    }, { onConflict: "user_id,device_fingerprint" }).select("id").single();
    if (error) throw error;
    if (!existing) {
      await supabaseAdmin!.from("security_notifications").insert({
        user_id: user.id,
        event_type: "new_device_login",
        payload: { device_name: safe(body.deviceName), browser: safe(body.browser), os: safe(body.os), occurred_at: now.toISOString() },
      });
      const alertWebhook = process.env.SECURITY_EMAIL_WEBHOOK_URL;
      if (alertWebhook) {
        await fetch(alertWebhook, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            to: user.email,
            template: "new_device_login",
            device: safe(body.deviceName),
            browser: safe(body.browser),
            os: safe(body.os),
            occurredAt: now.toISOString(),
          }),
        }).catch(() => undefined);
      }
    }
    return NextResponse.json({ ok: true, sessionId: data.id });
  } catch (error) {
    const status = error instanceof PaymentApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to register device." }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requirePaymentUser(request);
    const body = await request.json() as { sessionId?: string };
    if (!body.sessionId) return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin!.from("user_sessions").update({ presence_status: "offline", presence_updated_at: now, last_active: now })
      .eq("id", body.sessionId).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof PaymentApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update presence." }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requirePaymentUser(request);
    const { error } = await supabaseAdmin!.from("user_sessions").update({
      is_active: false, revoked_at: new Date().toISOString(),
    }).eq("user_id", user.id).eq("is_active", true);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof PaymentApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to sign out devices." }, { status });
  }
}
