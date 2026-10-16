import { NextResponse } from "next/server";
import { ApiError, requireUser, supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const [sessions, quizzes] = await Promise.all([
      supabaseAdmin!.from("user_sessions").select("id,device_name,browser,os,last_active,is_active").eq("user_id", user.id).eq("is_active", true).order("last_active", { ascending: false }),
      supabaseAdmin!.from("quiz_attempts").select("id,score,total_questions,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
    ]);
    return NextResponse.json({
      sessions: sessions.data ?? [],
      quizzes: quizzes.data ?? [],
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load account overview." }, { status });
  }
}
