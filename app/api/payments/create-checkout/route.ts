import { NextResponse } from "next/server";
import { planCatalog, type PlanId } from "@/lib/payments";
import { PaymentApiError, requirePaymentUser } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, rejectOversizedJson, requestIdentity } from "@/lib/security/rate-limit";

const razorpayPlanByPlan: Record<PlanId, string | undefined> = {
  monthly: process.env.RAZORPAY_PLAN_MONTHLY,
  half_yearly: process.env.RAZORPAY_PLAN_HALF_YEARLY,
  yearly: process.env.RAZORPAY_PLAN_YEARLY,
};

export async function POST(request: Request) {
  const limit = checkRateLimit(`checkout:${requestIdentity(request)}`, 8);
  if (!limit.allowed) return rateLimitResponse(limit);
  if (rejectOversizedJson(request, 4_096)) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  try {
    const body = (await request.json().catch(() => null)) as { planId?: PlanId } | null;
    if (!body?.planId || !planCatalog[body.planId]) {
      return NextResponse.json({ error: "Invalid subscription plan." }, { status: 400 });
    }

    const user = await requirePaymentUser(request);
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const razorpayPlan = razorpayPlanByPlan[body.planId];
    if (!keyId || !keySecret || !razorpayPlan) {
      return NextResponse.json({ error: "Razorpay subscription plans are not configured yet." }, { status: 503 });
    }

    const plan = planCatalog[body.planId];
    const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        plan_id: razorpayPlan,
        total_count: 1,
        quantity: 1,
        customer_notify: 1,
        notes: { plan_id: body.planId, user_id: user.id },
      }),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => null) as { error?: { description?: string; code?: string } } | null;
      const detail = failure?.error?.description;
      return NextResponse.json({
        error: detail
          ? `Razorpay rejected the subscription: ${detail}`
          : "Razorpay subscription creation failed. Confirm that the API key and Plan ID are from the same test mode.",
      }, { status: 502 });
    }

    const checkout = (await response.json()) as { id: string };
    return NextResponse.json({
      provider: "razorpay",
      subscriptionId: checkout.id,
      amount: plan.amountInr * 100,
      currency: "INR",
      keyId,
      name: "DevOpsCrack",
      description: `${plan.name} interview preparation subscription`,
      prefill: { email: user.email, name: user.user_metadata?.full_name ?? user.user_metadata?.name },
    });
  } catch (error) {
    if (error instanceof PaymentApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to prepare checkout. Please try again." }, { status: 500 });
  }
}
