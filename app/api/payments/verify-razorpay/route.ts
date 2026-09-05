import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { planCatalog, type PlanId } from "@/lib/payments";
import { PaymentApiError, requirePaymentUser, supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requirePaymentUser(request);
    const body = (await request.json()) as {
      planId?: PlanId;
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_subscription_id?: string;
      razorpay_signature?: string;
    };
    if (!body.planId || !planCatalog[body.planId] || !body.razorpay_payment_id || !body.razorpay_signature) {
      throw new PaymentApiError("Incomplete Razorpay response.");
    }
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new PaymentApiError("Razorpay is not configured.", 503);
    const providerId = body.razorpay_subscription_id ?? body.razorpay_order_id;
    if (!providerId) throw new PaymentApiError("Missing Razorpay order reference.");

    const message = body.razorpay_subscription_id
      ? `${body.razorpay_payment_id}|${body.razorpay_subscription_id}`
      : `${body.razorpay_order_id}|${body.razorpay_payment_id}`;
    const expected = createHmac("sha256", secret).update(message).digest();
    const supplied = Buffer.from(body.razorpay_signature, "hex");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      throw new PaymentApiError("Payment verification failed.", 400);
    }

    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + planCatalog[body.planId].durationMonths);

    const { data: subscription, error } = await supabaseAdmin!
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          provider: "razorpay",
          provider_subscription_id: providerId,
          plan: body.planId,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: expires.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: "provider_subscription_id" },
      )
      .select("id")
      .single();
    if (error) throw new PaymentApiError("Could not activate your subscription.", 500);

    await Promise.all([
      supabaseAdmin!.from("profiles").update({
        subscription_status: "active",
        subscription_plan: body.planId,
        subscription_expires_at: expires.toISOString(),
        updated_at: now.toISOString(),
      }).eq("id", user.id),
      supabaseAdmin!.from("payments").upsert({
        user_id: user.id,
        subscription_id: subscription.id,
        provider: "razorpay",
        provider_payment_id: body.razorpay_payment_id,
        amount: planCatalog[body.planId].amountInr * 100,
        currency: "INR",
        status: "paid",
        paid_at: now.toISOString(),
      }, { onConflict: "provider_payment_id" }),
    ]);
    return NextResponse.json({ ok: true, redirectTo: "/dashboard?checkout=success" });
  } catch (error) {
    const status = error instanceof PaymentApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verification failed." }, { status });
  }
}
