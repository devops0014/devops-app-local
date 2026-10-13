import { NextResponse } from "next/server";
import { ApiError, requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { experienceLabels, goalLabels } from "@/lib/leads";

/** Saves the three quick questions students answer after verification. */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => null)) as { experience?: string; goal?: string; jobTitle?: string; city?: string; skip?: boolean } | null;
    const now = new Date().toISOString();
    if (body?.skip) {
      await supabaseAdmin!.from("profiles").update({ onboarded_at: now }).eq("id", user.id);
      return NextResponse.json({ ok: true });
    }
    if (!body?.experience || !(body.experience in experienceLabels)) throw new ApiError("Choose your experience.");
    if (!body.goal || !(body.goal in goalLabels)) throw new ApiError("Choose your goal.");
    const jobTitle = String(body.jobTitle ?? "").trim().slice(0, 80) || null;
    const city = String(body.city ?? "").trim().slice(0, 60) || null;
    const { error } = await supabaseAdmin!.from("profiles").update({
      experience_level: body.experience, career_goal: body.goal, job_title: jobTitle, city, onboarded_at: now, updated_at: now,
    }).eq("id", user.id);
    if (error) throw new ApiError("Could not save your answers.", 500);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save." }, { status });
  }
}
