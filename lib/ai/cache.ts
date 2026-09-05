import "server-only";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

export type AIFeature = "answer_evaluation" | "resume_review" | "mock_feedback" | "adaptive_follow_up" | "career_suggestion" | "admin_enrichment";

export function createAIRequestHash(feature: AIFeature, input: unknown) {
  return createHash("sha256").update(`${feature}:${stableStringify(input)}`).digest("hex");
}

export async function getCachedAIResponse<T>(feature: AIFeature, input: unknown): Promise<T | null> {
  if (!supabaseAdmin) return null;
  const requestHash = createAIRequestHash(feature, input);
  const { data } = await supabaseAdmin.from("ai_response_cache").select("response,expires_at")
    .eq("feature", feature).eq("request_hash", requestHash).maybeSingle();
  if (!data || (data.expires_at && new Date(data.expires_at) <= new Date())) return null;
  return data.response as T;
}

export async function cacheAIResponse(input: {
  userId?: string;
  feature: AIFeature;
  request: unknown;
  response: unknown;
  model?: string;
  tokensUsed?: number;
  expiresAt?: string;
}) {
  if (!supabaseAdmin) throw new Error("AI cache is unavailable.");
  return supabaseAdmin.from("ai_response_cache").upsert({
    user_id: input.userId ?? null,
    feature: input.feature,
    request_hash: createAIRequestHash(input.feature, input.request),
    response: input.response,
    model: input.model ?? null,
    tokens_used: input.tokensUsed ?? 0,
    expires_at: input.expiresAt ?? null,
  }, { onConflict: "feature,request_hash" });
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
