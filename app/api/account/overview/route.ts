import { NextResponse } from "next/server";
import { PaymentApiError, requirePaymentUser, supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const user = await requirePaymentUser(request);
    const month = new Date();
    month.setUTCDate(1);
    const monthKey = month.toISOString().slice(0, 10);
    const [profile, subscription, usage, sessions, mocks, quizzes] = await Promise.all([
      supabaseAdmin!.from("profiles").select("subscription_plan,subscription_status,subscription_expires_at").eq("id", user.id).maybeSingle(),
      supabaseAdmin!.from("subscriptions").select("plan,status,current_period_end,cancel_at_period_end").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin!.from("user_ai_usage").select("mock_interviews_used,resume_reviews_used,tokens_used,last_reset").eq("user_id", user.id).eq("month", monthKey).maybeSingle(),
      supabaseAdmin!.from("user_sessions").select("id,device_name,browser,os,last_active,is_active").eq("user_id", user.id).eq("is_active", true).order("last_active", { ascending: false }),
      supabaseAdmin!.from("mock_interviews").select("id,score,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
      supabaseAdmin!.from("quiz_attempts").select("id,score,total_questions,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
    ]);
    return NextResponse.json({
      profile: profile.data,
      subscription: subscription.data,
      usage: usage.data ?? { mock_interviews_used: 0, resume_reviews_used: 0, tokens_used: 0, last_reset: new Date().toISOString() },
      sessions: sessions.data ?? [],
      mockInterviews: mocks.data ?? [],
      quizzes: quizzes.data ?? [],
    });
  } catch (error) {
    const status = error instanceof PaymentApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load account overview." }, { status });
  }
}
