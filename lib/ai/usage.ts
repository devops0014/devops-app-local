import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export type MeteredAIFeature = "mock_interview" | "resume_review" | "answer_evaluation" | "mock_feedback" | "adaptive_follow_up" | "career_suggestion";

export async function consumeAIAllowance(userAccessToken: string, feature: MeteredAIFeature, tokensUsed = 0) {
  if (!supabaseAdmin) throw new Error("AI usage metering is unavailable.");
  const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(userAccessToken);
  if (authError || !auth.user) throw new Error("Authentication required.");
  const userClient = (await import("@supabase/supabase-js")).createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${userAccessToken}` } }, auth: { persistSession: false } },
  );
  const { data, error } = await userClient.rpc("consume_ai_credit", {
    p_feature: feature,
    p_tokens: Math.max(0, Math.floor(tokensUsed)),
  });
  if (error) throw new Error(error.message);
  return data;
}
