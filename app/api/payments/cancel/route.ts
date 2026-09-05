import { NextResponse } from "next/server";
import { PaymentApiError, requirePaymentUser, supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requirePaymentUser(request);
    const { data: subscription } = await supabaseAdmin!
      .from("subscriptions")
      .select("id, provider, provider_subscription_id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!subscription?.provider_subscription_id) throw new PaymentApiError("No active subscription was found.", 404);

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new PaymentApiError("Razorpay is not configured.", 503);
    const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscription.provider_subscription_id}/cancel`, {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ cancel_at_cycle_end: 1 }),
    });
    if (!response.ok) throw new PaymentApiError("Razorpay could not schedule cancellation.", 502);

    await supabaseAdmin!.from("subscriptions")
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("id", subscription.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof PaymentApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cancellation failed." }, { status });
  }
}
