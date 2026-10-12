import { apiError, requireAdmin } from "@/lib/admin/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const [
      { data: students, error: studentError },
      { data: logs, error: logError }, { data: quizzes },
      { data: progress }, { data: sessions },
    ] = await Promise.all([
      supabaseAdmin!.from("profiles").select("id,email,name,mobile,role,created_at").order("created_at", { ascending: false }).limit(500),
      supabaseAdmin!.from("activity_logs").select("id,actor_id,action,entity_type,entity_id,metadata,created_at,profiles(name,email)").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin!.from("quiz_attempts").select("user_id,score,total_questions"),
      supabaseAdmin!.from("general_question_progress").select("user_id,status,confidence_score"),
      supabaseAdmin!.from("user_sessions").select("user_id,is_active,last_active,presence_status,presence_updated_at"),
    ]);
    if (studentError) throw studentError;
    if (logError) throw logError;
    return Response.json({
      students: (students ?? []).filter((student) => student.role !== "admin").map((student) => {
        const userQuizzes = (quizzes ?? []).filter((item) => item.user_id === student.id);
        const userProgress = (progress ?? []).filter((item) => item.user_id === student.id);
        const quizAverage = average(userQuizzes.map((item) => Number(item.score) / Math.max(1, Number(item.total_questions)) * 100));
        const mastery = userProgress.length
          ? userProgress.filter((item) => item.status === "Mastered" && Number(item.confidence_score) >= 4).length / userProgress.length * 100 : 0;
        const available = [userQuizzes.length ? quizAverage : null, userProgress.length ? mastery : null].filter((value): value is number => value !== null);
        const latestSession = (sessions ?? []).filter((item) => item.user_id === student.id).sort((a,b) => +new Date(b.last_active) - +new Date(a.last_active))[0];
        const online = Boolean(latestSession?.is_active && latestSession.presence_status === "online" && Date.now() - +new Date(latestSession.presence_updated_at) < 120_000);
        return {
          ...student,
          quiz_attempts: userQuizzes.length,
          quiz_average: Math.round(quizAverage),
          mastery_percent: Math.round(mastery), performance_score: Math.round(average(available)),
          active_devices: (sessions ?? []).filter((item) => item.user_id === student.id && item.is_active).length,
          last_active: latestSession?.last_active ?? null,
          is_online: online,
        };
      }),
      logs: logs ?? [],
    });
  } catch (cause) { return apiError(cause); }
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}
