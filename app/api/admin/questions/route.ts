import { apiError, audit, jsonBody, requireAdmin, sourceHash, AdminApiError } from "@/lib/admin/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const COMMON = "id,category_id,question_text,answer_text,difficulty,tags,company_asked,is_published,review_status,enrichment_status,created_at,categories(name,slug)";

function bankName(value: unknown) {
  if (value === "mcq" || value === "general") return value;
  throw new AdminApiError("Question bank must be MCQ or General.");
}

function validateOptions(body: Record<string, unknown>, bank: "mcq" | "general") {
  const question = String(body.question_text ?? "").trim();
  const answer = String(body.answer_text ?? "").trim();
  const categoryId = String(body.category_id ?? "");
  if (question.length < 10 || answer.length < 10 || !categoryId) throw new AdminApiError("Category, question, and expected answer are required.");
  if (bank === "mcq") {
    if (!Array.isArray(body.options) || body.options.length < 2 || body.options.length > 8) throw new AdminApiError("MCQs require between 2 and 8 answer options.");
    const correct = Number(body.correct_option);
    if (!Number.isInteger(correct) || correct < 0 || correct >= body.options.length) throw new AdminApiError("Select a valid correct MCQ option.");
  }
  return { question, answer, categoryId };
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const [mcq, general] = await Promise.all([
      supabaseAdmin!.from("mcq_questions").select(`${COMMON},options,correct_option,explanation`).order("created_at", { ascending: false }).limit(1000),
      supabaseAdmin!.from("general_questions").select(`${COMMON},question_type,explanation,expected_keywords,hints`).order("created_at", { ascending: false }).limit(1000),
    ]);
    if (mcq.error) throw mcq.error;
    if (general.error) throw general.error;
    const questions = [
      ...(mcq.data ?? []).map((row) => ({ ...row, bank: "mcq", question_type: "mcq" })),
      ...(general.data ?? []).map((row) => ({ ...row, bank: "general", options: null, correct_option: null })),
    ].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return Response.json({ questions });
  } catch (cause) { return apiError(cause); }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await jsonBody<Record<string, unknown>>(request);
    const bank = bankName(body.bank ?? (Array.isArray(body.options) && body.options.length ? "mcq" : "general"));
    const { question, answer, categoryId } = validateOptions(body, bank);
    const table = bank === "mcq" ? "mcq_questions" : "general_questions";
    const payload = {
      category_id: categoryId, question_text: question, answer_text: answer,
      difficulty: body.difficulty, tags: body.tags, company_asked: body.company_asked,
      source_hash: sourceHash(question, categoryId), is_published: Boolean(body.is_published),
      review_status: body.is_published ? "approved" : "pending", enrichment_status: "ready", created_by: admin.id,
    };
    const result = bank === "mcq"
      ? await supabaseAdmin!.from("mcq_questions").insert({ ...payload, options: body.options, correct_option: body.correct_option, explanation: body.explanation ?? null }).select("id").single()
      : await supabaseAdmin!.from("general_questions").insert({ ...payload, question_type: body.question_type ?? "general", explanation: body.explanation ?? null }).select("id").single();
    const { data, error } = result;
    if (error?.code === "23505") throw new AdminApiError("This question already exists.", 409);
    if (error) throw error;
    await audit(admin.id, "question.created", `${bank}_question`, data.id, { published: body.is_published });
    return Response.json({ question: { id: data.id, bank } }, { status: 201 });
  } catch (cause) { return apiError(cause); }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await jsonBody<Record<string, unknown> & { id?: string; action?: string }>(request);
    if (body.action === "publish_all_drafts") {
      const now = new Date().toISOString();
      const [mcq, general] = await Promise.all([
        supabaseAdmin!.from("mcq_questions").update({ is_published: true, review_status: "approved", enrichment_status: "ready", updated_at: now }).eq("is_published", false).select("id"),
        supabaseAdmin!.from("general_questions").update({ is_published: true, review_status: "approved", enrichment_status: "ready", updated_at: now }).eq("is_published", false).select("id"),
      ]);
      if (mcq.error) throw mcq.error;
      if (general.error) throw general.error;
      const updated = (mcq.data?.length ?? 0) + (general.data?.length ?? 0);
      await audit(admin.id, "questions.bulk_published", "question_bank", null, { updated });
      return Response.json({ updated });
    }
    if (!body.id) throw new AdminApiError("Question ID is required.");
    const bank = bankName(body.bank);
    const { id, ...changesWithBank } = body;
    const { bank: _ignoredBank, ...changes } = changesWithBank;
    void _ignoredBank;
    const table = bank === "mcq" ? "mcq_questions" : "general_questions";
    const payload: Record<string, unknown> = { ...changes, updated_at: new Date().toISOString() };
    if (changes.question_text && changes.category_id) payload.source_hash = sourceHash(String(changes.question_text), String(changes.category_id));
    if (changes.review_status === "approved") payload.is_published = true;
    if (changes.review_status === "rejected") payload.is_published = false;
    const { error } = await supabaseAdmin!.from(table).update(payload).eq("id", id);
    if (error?.code === "23505") throw new AdminApiError("This question duplicates an existing question.", 409);
    if (error) throw error;
    await audit(admin.id, `question.${changes.review_status || "updated"}`, `${bank}_question`, id);
    return Response.json({ question: { id, bank } });
  } catch (cause) { return apiError(cause); }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const bank = bankName(url.searchParams.get("bank"));
    if (!id) throw new AdminApiError("Question ID is required.");
    const { error } = await supabaseAdmin!.from(bank === "mcq" ? "mcq_questions" : "general_questions").delete().eq("id", id);
    if (error) throw error;
    await audit(admin.id, "question.deleted", `${bank}_question`, id);
    return Response.json({ success: true });
  } catch (cause) { return apiError(cause); }
}
