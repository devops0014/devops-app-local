import { NextResponse } from "next/server";
import { planCatalog, type PlanId } from "@/lib/payments";
import { activateSubscription, claimWebhookEvent, unixToIso, verifyHmacSha256 } from "@/lib/payments/server";

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = request.headers.get("x-razorpay-signature");
  const eventId = request.headers.get("x-razorpay-event-id");
  const rawBody = await request.text();
  if (!secret || !signature || !verifyHmacSha256(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    payload: {
      subscription?: { entity?: Record<string, unknown> };
      payment?: { entity?: Record<string, unknown> };
    };
  };
  const subscription = event.payload.subscription?.entity;
  const payment = event.payload.payment?.entity;
  const id = eventId ?? `${event.event}:${String(subscription?.id ?? payment?.id ?? "")}`;
  if (!(await claimWebhookEvent("razorpay", id, event.event))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (subscription) {
    const notes = (subscription.notes ?? {}) as Record<string, string>;
    const userId = notes.user_id;
    const planId = notes.plan_id as PlanId;
    const providerStatus = String(subscription.status ?? "");
    const status = event.event.includes("cancelled")
      ? "cancelled"
      : providerStatus === "active" || providerStatus === "authenticated" ? "active"
        : providerStatus === "pending" ? "past_due" : "expired";
    if (userId && planId && planCatalog[planId]) {
      await activateSubscription({
        userId,
        provider: "razorpay",
        providerSubscriptionId: String(subscription.id),
        planId,
        status,
        periodStart: unixToIso(subscription.current_start as number),
        periodEnd: unixToIso(subscription.current_end as number),
      });
    }
  }
  return NextResponse.json({ received: true });
}
