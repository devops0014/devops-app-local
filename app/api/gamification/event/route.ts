import { NextResponse } from "next/server";
import { levelForXp, mockXp, quizXp, xpRules, type GamificationEventType } from "@/lib/gamification";
import { PaymentApiError, requirePaymentUser, supabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, rejectOversizedJson, requestIdentity } from "@/lib/security/rate-limit";

const supported = new Set<GamificationEventType>([
  "question_mastered", "question_unmastered", "flashcard_known", "flashcard_revision",
  "quiz_completed", "mock_completed", "daily_goal",
]);

function xpForEvent(type: GamificationEventType, metadata: Record<string, unknown>) {
  if (type === "question_mastered") return xpRules.practiceMastered;
  if (type === "question_unmastered") return xpRules.practiceUnmastered;
  if (type === "flashcard_known") return xpRules.flashcardKnown;
  if (type === "flashcard_revision") return xpRules.flashcardRevision;
  if (type === "quiz_completed") return quizXp(Number(metadata.correct ?? 0), Number(metadata.total ?? 0));
  if (type === "mock_completed") return mockXp(Number(metadata.score ?? 0));
  return 50;
}

export async function POST(request: Request) {
  const limit = checkRateLimit(`gamification:${requestIdentity(request)}`, 40);
  if (!limit.allowed) return rateLimitResponse(limit);
  if (rejectOversizedJson(request)) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }
  try {
    const user = await requirePaymentUser(request);
    const body = (await request.json().catch(() => null)) as {
      eventType?: GamificationEventType;
      eventKey?: string;
      metadata?: Record<string, unknown>;
    } | null;
    if (!body?.eventType || !supported.has(body.eventType) || !body.eventKey || body.eventKey.length > 180) {
      throw new PaymentApiError("Invalid reward event.");
    }
    const metadata = body.metadata ?? {};
    const { data, error } = await supabaseAdmin!.rpc("award_gamification_event", {
      p_user_id: user.id,
      p_event_type: body.eventType,
      p_event_key: `${body.eventType}:${body.eventKey}`,
      p_amount: xpForEvent(body.eventType, metadata),
      p_metadata: metadata,
    });
    if (error) throw new PaymentApiError("Could not record XP.", 500);

    const unlockedBadges = await unlockEligibleBadges(user.id, body.eventType, metadata, Number(data.xp), Number(data.streak));
    const level = levelForXp(Number(data.xp));
    return NextResponse.json({
      xp: Number(data.xp),
      level: level.level,
      levelName: level.name,
      streak: Number(data.streak),
      bestStreak: Number(data.bestStreak),
      unlockedBadges,
    });
  } catch (error) {
    const status = error instanceof PaymentApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reward processing failed." }, { status });
  }
}

async function unlockEligibleBadges(
  userId: string,
  eventType: GamificationEventType,
  metadata: Record<string, unknown>,
  xp: number,
  streak: number,
) {
  const slugs = new Set<string>();
  if (eventType === "question_mastered") slugs.add("first-master");
  if (eventType === "quiz_completed" && Number(metadata.score ?? 0) >= 90) slugs.add("quiz-sharpshooter");
  if (eventType === "mock_completed" && Number(metadata.score ?? 0) >= 85) slugs.add("mock-ace");
  if (streak >= 7) slugs.add("streak-seven");
  if (streak >= 30) slugs.add("streak-thirty");
  if (xp >= 7500) slugs.add("xp-7500");
  if (!slugs.size) return [];

  const { data: badges } = await supabaseAdmin!.from("badges").select("id,slug").in("slug", [...slugs]);
  if (!badges?.length) return [];
  const { data: existing } = await supabaseAdmin!.from("user_badges").select("badge_id").eq("user_id", userId).in("badge_id", badges.map((badge) => badge.id));
  const existingIds = new Set((existing ?? []).map((item) => item.badge_id));
  const fresh = badges.filter((badge) => !existingIds.has(badge.id));
  if (fresh.length) {
    await supabaseAdmin!.from("user_badges").insert(fresh.map((badge) => ({ user_id: userId, badge_id: badge.id })));
  }
  return fresh.map((badge) => badge.slug);
}
