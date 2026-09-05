import { apiError, audit, jsonBody, requireAdmin, AdminApiError } from "@/lib/admin/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type Enrichment = {
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
  subtopic: string;
  explanation: string;
  expected_keywords: string[];
  hints: string[];
  common_mistakes: string[];
  follow_up_questions: string[];
  tags: string[];
};

async function enrich(question: { question_text: string; answer_text: string; difficulty: string; tags: string[] }) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new AdminApiError("OPENAI_API_KEY is not configured on the server.", 503);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_ADMIN_MODEL || "gpt-4o-mini",
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You enrich DevOps interview questions. Return strict JSON only with difficulty (Easy|Medium|Hard), topic, subtopic, explanation, expected_keywords[], hints[], common_mistakes[], follow_up_questions[], tags[]. Keep technical claims accurate and concise." },
        { role: "user", content: JSON.stringify(question) },
      ],
    }),
  });
  if (!response.ok) throw new Error(openAIErrorMessage(response.status));
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty enrichment.");
  return JSON.parse(content) as Enrichment;
}

function openAIErrorMessage(status: number) {
  if (status === 401) {
    return "OpenAI rejected the API key. Replace OPENAI_API_KEY with an active project key, then restart the application.";
  }
  if (status === 403) {
    return "This OpenAI project is not allowed to use the configured model. Check the project permissions or OPENAI_ADMIN_MODEL.";
  }
  if (status === 429) {
    return "OpenAI rate or billing limit reached. Check project credits, usage limits, and billing.";
  }
  return `OpenAI enrichment could not be completed (HTTP ${status}).`;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { data: jobs, error: jobsError } = await supabaseAdmin!
      .from("ai_processing_jobs")
      .select("id,stage,status,progress,source_question_count,generated_count,error_message,created_at,content_uploads(file_name)")
      .order("created_at", { ascending: false }).limit(50);
    if (jobsError) throw jobsError;
    const [mcqReview, generalReview] = await Promise.all([
      supabaseAdmin!.from("mcq_questions")
        .select("id,category_id,question_text,answer_text,difficulty,tags,company_asked,is_published,review_status,enrichment_status,topic,subtopic,explanation,options,correct_option,created_at,categories(name,slug)")
        .in("review_status", ["pending","approved","rejected"]).order("created_at", { ascending: false }).limit(250),
      supabaseAdmin!.from("general_questions")
        .select("id,category_id,question_text,answer_text,difficulty,tags,company_asked,is_published,review_status,enrichment_status,topic,subtopic,question_type,explanation,expected_keywords,hints,created_at,categories(name,slug)")
        .in("review_status", ["pending","approved","rejected"]).order("created_at", { ascending: false }).limit(250),
    ]);
    if (mcqReview.error) throw mcqReview.error;
    if (generalReview.error) throw generalReview.error;
    const review = [
      ...(mcqReview.data ?? []).map((row) => ({ ...row, bank: "mcq", question_type: "mcq" })),
      ...(generalReview.data ?? []).map((row) => ({ ...row, bank: "general", options: null, correct_option: null })),
    ].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return Response.json({ jobs: jobs ?? [], review });
  } catch (cause) { return apiError(cause); }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const { jobId } = await jsonBody<{ jobId?: string }>(request);
    if (!jobId) throw new AdminApiError("Processing job ID is required.");
    const { data: job, error: jobError } = await supabaseAdmin!.from("ai_processing_jobs")
      .select("id,status,source_question_count,generated_count,upload_id").eq("id", jobId).single();
    if (jobError || !job) throw new AdminApiError("Processing job was not found.", 404);
    if (job.status === "completed" || job.status === "review") return Response.json({ job });

    await supabaseAdmin!.from("ai_processing_jobs").update({
      status: "running", stage: "enriching", started_at: new Date().toISOString(), error_message: null,
    }).eq("id", jobId);
    const [mcqBatch, generalBatch] = await Promise.all([
      supabaseAdmin!.from("mcq_questions").select("id,question_text,answer_text,difficulty,tags,import_row_number").eq("import_job_id", jobId).in("enrichment_status", ["queued","failed"]).order("import_row_number").limit(5),
      supabaseAdmin!.from("general_questions").select("id,question_text,answer_text,difficulty,tags,import_row_number").eq("import_job_id", jobId).in("enrichment_status", ["queued","failed"]).order("import_row_number").limit(5),
    ]);
    if (mcqBatch.error) throw mcqBatch.error;
    if (generalBatch.error) throw generalBatch.error;
    const questions = [
      ...(mcqBatch.data ?? []).map((row) => ({ ...row, bank: "mcq" as const })),
      ...(generalBatch.data ?? []).map((row) => ({ ...row, bank: "general" as const })),
    ].sort((a, b) => a.import_row_number - b.import_row_number).slice(0, 5);
    let generated = job.generated_count || 0;
    for (const question of questions) {
      const table = question.bank === "mcq" ? "mcq_questions" : "general_questions";
      await supabaseAdmin!.from(table).update({ enrichment_status: "processing" }).eq("id", question.id);
      try {
        const result = await enrich(question);
        const shared = {
          difficulty: result.difficulty,
          topic: result.topic,
          subtopic: result.subtopic,
          explanation: result.explanation,
          tags: Array.from(new Set([...(question.tags || []), ...(result.tags || [])])),
          enrichment_status: "ready",
          updated_at: new Date().toISOString(),
        };
        const update = question.bank === "general"
          ? { ...shared, expected_keywords: result.expected_keywords, hints: result.hints }
          : shared;
        const { error: updateError } = await supabaseAdmin!.from(table).update(update).eq("id", question.id);
        if (updateError) throw updateError;
        generated++;
      } catch (cause) {
        await supabaseAdmin!.from(table).update({ enrichment_status: "failed" }).eq("id", question.id);
        await supabaseAdmin!.from("ai_processing_jobs").update({
          error_message: cause instanceof Error ? cause.message : "Enrichment failed.",
        }).eq("id", jobId);
      }
      const progress = Math.min(95, Math.round((generated / Math.max(1, job.source_question_count)) * 90) + 5);
      await supabaseAdmin!.from("ai_processing_jobs").update({ generated_count: generated, progress }).eq("id", jobId);
    }
    const [mcqRemaining, generalRemaining, mcqFailed, generalFailed] = await Promise.all([
      supabaseAdmin!.from("mcq_questions").select("id", { count: "exact", head: true }).eq("import_job_id", jobId).in("enrichment_status", ["queued", "processing"]),
      supabaseAdmin!.from("general_questions").select("id", { count: "exact", head: true }).eq("import_job_id", jobId).in("enrichment_status", ["queued", "processing"]),
      supabaseAdmin!.from("mcq_questions").select("id", { count: "exact", head: true }).eq("import_job_id", jobId).eq("enrichment_status", "failed"),
      supabaseAdmin!.from("general_questions").select("id", { count: "exact", head: true }).eq("import_job_id", jobId).eq("enrichment_status", "failed"),
    ]);
    const remaining = (mcqRemaining.count ?? 0) + (generalRemaining.count ?? 0);
    const failed = (mcqFailed.count ?? 0) + (generalFailed.count ?? 0);
    const finished = !remaining && !failed;
    const status = failed ? "failed" : finished ? "review" : "running";
    const progress = finished ? 100 : Math.min(95, Math.round((generated / Math.max(1, job.source_question_count)) * 90) + 5);
    const { data: updated } = await supabaseAdmin!.from("ai_processing_jobs").update({
      status,
      stage: failed ? "enrichment_failed" : finished ? "awaiting_review" : "enriching",
      progress,
      generated_count: generated,
      completed_at: finished ? new Date().toISOString() : null,
    }).eq("id", jobId).select("*").single();
    if (finished) await supabaseAdmin!.from("content_uploads").update({ status: "completed" }).eq("id", job.upload_id);
    await audit(admin.id, "ai_enrichment.batch", "ai_processing_job", jobId, { generated, remaining: remaining || 0 });
    return Response.json({ job: updated, remaining: remaining || 0 });
  } catch (cause) { return apiError(cause); }
}
