import { supabase } from "@/lib/supabase/client";
import type { MockInterviewReport, QuizAttempt, UserQuestionState } from "@/lib/types";

export type CloudLearningState = {
  progress: Record<string, UserQuestionState>;
  quizAttempts: QuizAttempt[];
  mockReports: MockInterviewReport[];
  xp: number;
  level: number;
  streak: number;
  bestStreak: number;
};

async function currentUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function loadLearningState(): Promise<CloudLearningState | null> {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;

  const [profileResult, progressResult, attemptsResult, mocksResult] = await Promise.all([
    supabase.from("profiles").select("xp,level,streak,best_streak").eq("id", userId).single(),
    supabase.from("general_question_progress").select("question_id,status,confidence_score,is_bookmarked,personal_note,last_attempt_at,question:general_questions(source_key)").eq("user_id", userId),
    supabase.from("quiz_attempts").select("id,mode,score,total_questions,time_taken,weak_categories,questions_snapshot,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    supabase.from("mock_interviews").select("id,technology,company,experience_level,score,time_taken,answers_given,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);

  const progress = Object.fromEntries((progressResult.data ?? []).map((row) => [
    row.question?.[0]?.source_key ?? row.question_id,
    {
      status: row.status,
      confidence: row.confidence_score ?? 3,
      bookmarked: row.is_bookmarked,
      note: row.personal_note ?? "",
      lastAttemptAt: row.last_attempt_at ?? undefined,
    } satisfies UserQuestionState,
  ]));

  const quizAttempts: QuizAttempt[] = (attemptsResult.data ?? []).map((row) => ({
    id: row.id,
    mode: row.mode as QuizAttempt["mode"],
    score: row.score,
    total: row.total_questions,
    timeSeconds: row.time_taken,
    categories: Array.isArray(row.questions_snapshot) ? row.questions_snapshot.map((item) => String(item)) : [],
    weakCategories: Array.isArray(row.weak_categories) ? row.weak_categories.map((item) => String(item)) : [],
    createdAt: row.created_at,
  }));

  const mockReports: MockInterviewReport[] = (mocksResult.data ?? []).map((row) => ({
    id: row.id,
    technology: row.technology ?? "Mixed DevOps",
    company: row.company ?? "General",
    level: row.experience_level ?? "3–5 years",
    score: row.score ?? 0,
    timeSeconds: row.time_taken,
    answered: Array.isArray(row.answers_given) ? row.answers_given.length : 0,
    createdAt: row.created_at,
  }));

  return {
    progress,
    quizAttempts,
    mockReports,
    xp: profileResult.data?.xp ?? 0,
    level: profileResult.data?.level ?? 1,
    streak: profileResult.data?.streak ?? 0,
    bestStreak: profileResult.data?.best_streak ?? 0,
  };
}

export async function saveQuestionProgress(questionId: string, state: UserQuestionState) {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { data: question } = isUuid(questionId)
    ? await supabase.from("general_questions").select("id").eq("id", questionId).maybeSingle()
    : await supabase.from("general_questions").select("id").eq("source_key", questionId).maybeSingle();
  if (!question) return;
  await supabase.from("general_question_progress").upsert({
    user_id: userId,
    question_id: question.id,
    status: state.status,
    confidence_score: state.confidence,
    is_bookmarked: state.bookmarked,
    personal_note: state.note,
    last_attempt_at: new Date().toISOString(),
  }, { onConflict: "user_id,question_id" });
}

export async function saveQuizAttempt(attempt: QuizAttempt) {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  await supabase.from("quiz_attempts").insert({
    user_id: userId,
    mode: attempt.mode,
    score: attempt.score,
    total_questions: attempt.total,
    time_taken: attempt.timeSeconds,
    weak_categories: attempt.weakCategories,
    questions_snapshot: attempt.categories,
  });
}

export async function saveMockReport(report: MockInterviewReport) {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  if (isUuid(report.id)) return; // The server-side AI evaluation already persisted this report.
  await supabase.from("mock_interviews").insert({
    user_id: userId,
    technology: report.technology,
    company: report.company,
    experience_level: report.level,
    questions_snapshot: [],
    answers_given: Array.from({ length: report.answered }, (_, index) => ({ index })),
    score: report.score,
    time_taken: report.timeSeconds,
    status: "completed",
  });
}

export async function saveFlashcardReview(questionKey: string, known: boolean, intervalDays: number) {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { data: question } = isUuid(questionKey)
    ? await supabase.from("general_questions").select("id").eq("id", questionKey).maybeSingle()
    : await supabase.from("general_questions").select("id").eq("source_key", questionKey).maybeSingle();
  if (!question) return;
  await supabase.from("general_flashcard_reviews").upsert({
    user_id: userId,
    question_id: question.id,
    interval_days: intervalDays,
    review_count: 1,
    last_result: known ? "known" : "revision",
    last_reviewed_at: new Date().toISOString(),
    next_review_at: new Date(Date.now() + intervalDays * 86_400_000).toISOString(),
  }, { onConflict: "user_id,question_id" });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function subscribeToLearningState(userId: string, onChange: () => void) {
  if (!supabase) return () => undefined;
  const channel = supabase
    .channel(`learning-state:${userId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "quiz_attempts", filter: `user_id=eq.${userId}` }, onChange)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "mock_interviews", filter: `user_id=eq.${userId}` }, onChange)
    .subscribe();
  return () => {
    void supabase?.removeChannel(channel);
  };
}
