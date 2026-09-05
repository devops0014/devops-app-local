import { createHmac, timingSafeEqual } from "node:crypto";
import { planCatalog, type PlanId } from "@/lib/payments";
import { supabaseAdmin } from "@/lib/supabase/server";

export function verifyHmacSha256(rawBody: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const supplied = Buffer.from(signature, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export async function claimWebhookEvent(provider: "razorpay", eventId: string, eventType: string) {
  if (!supabaseAdmin) return false;
  const { error } = await supabaseAdmin.from("payment_webhook_events").insert({
    provider,
    provider_event_id: eventId,
    event_type: eventType,
  });
  return !error;
}

export async function activateSubscription(input: {
  userId: string;
  provider: "razorpay";
  providerSubscriptionId: string;
  providerCustomerId?: string | null;
  planId: PlanId;
  status: "trialing" | "active" | "past_due" | "cancelled" | "expired";
  periodStart?: string | null;
  periodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}) {
  if (!supabaseAdmin) throw new Error("Supabase service role is not configured.");
  const now = new Date();
  const fallbackEnd = new Date(now);
  fallbackEnd.setMonth(fallbackEnd.getMonth() + planCatalog[input.planId].durationMonths);
  const periodEnd = input.periodEnd ?? fallbackEnd.toISOString();

  await supabaseAdmin.from("subscriptions").upsert({
    user_id: input.userId,
    provider: input.provider,
    provider_customer_id: input.providerCustomerId,
    provider_subscription_id: input.providerSubscriptionId,
    plan: input.planId,
    status: input.status,
    current_period_start: input.periodStart ?? now.toISOString(),
    current_period_end: periodEnd,
    cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
    updated_at: now.toISOString(),
  }, { onConflict: "provider_subscription_id" });

  await supabaseAdmin.from("profiles").update({
    subscription_status: input.status,
    subscription_plan: input.planId,
    subscription_expires_at: periodEnd,
    updated_at: now.toISOString(),
  }).eq("id", input.userId);
}

export function unixToIso(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}
