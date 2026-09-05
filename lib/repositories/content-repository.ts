import { supabase } from "@/lib/supabase/client";
import type { Question } from "@/lib/types";

export type ContentSourceFormat = "csv" | "json" | "markdown" | "pdf";

export async function createContentProcessingJob(file: File, format: ContentSourceFormat) {
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Admin authentication is required.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  const { error: storageError } = await supabase.storage.from("question-imports").upload(storagePath, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (storageError) throw storageError;

  const { data: upload, error: uploadError } = await supabase
    .from("content_uploads")
    .insert({
      uploaded_by: user.id,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      source_format: format,
      status: "uploaded",
    })
    .select("id")
    .single();
  if (uploadError) throw uploadError;

  const { data: job, error: jobError } = await supabase
    .from("ai_processing_jobs")
    .insert({
      upload_id: upload.id,
      requested_by: user.id,
      stage: "queued",
      status: "queued",
      progress: 0,
    })
    .select("id,status")
    .single();
  if (jobError) throw jobError;
  return job;
}

export async function reviewGeneratedVariant(id: string, status: "approved" | "rejected") {
  if (!supabase) return;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Admin authentication is required.");
  const { error } = await supabase
    .from("question_variants")
    .update({
      review_status: status,
      reviewed_by: userData.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

type Bank = "general_questions" | "mcq_questions";
type BankRow = {
  id: string; source_key?: string | null; question_text: string; answer_text: string;
  difficulty: Question["difficulty"]; tags?: string[] | null; company_asked?: string[] | null;
  options?: unknown; correct_option?: number | null; question_type?: Question["questionType"] | null;
  hints?: string[] | null; expected_keywords?: string[] | null;
  categories?: { name?: string; slug?: string } | Array<{ name?: string; slug?: string }> | null;
};

function parseOptions(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String).map((item) => item.trim()).filter(Boolean) : []; }
    catch { return []; }
  }
  return [];
}

async function listBank(bank: Bank): Promise<Question[]> {
  if (!supabase) return [];
  const rows: BankRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from(bank)
      .select(bank === "mcq_questions"
        ? "id,source_key,question_text,answer_text,difficulty,tags,company_asked,options,correct_option,explanation,is_published,categories(name,slug)"
        : "id,source_key,question_text,answer_text,difficulty,tags,company_asked,question_type,hints,expected_keywords,is_published,categories(name,slug)")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as BankRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows.map((row) => {
    const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    const options = parseOptions("options" in row ? row.options : null);
    const correctOption = row.correct_option == null ? undefined : Number(row.correct_option);
    return {
      id: row.source_key || row.id,
      databaseId: row.id,
      category: category?.name || "DevOps",
      categorySlug: category?.slug || "devops",
      question: row.question_text,
      answer: row.answer_text,
      difficulty: row.difficulty,
      tags: row.tags || [],
      companies: row.company_asked || [],
      bookmarks: 0,
      options: options.length >= 2 ? options : undefined,
      correctOption: Number.isInteger(correctOption) ? correctOption : undefined,
      questionType: bank === "mcq_questions" ? "mcq" : (row.question_type || "general"),
      hints: Array.isArray(row.hints) ? row.hints.map(String) : undefined,
      expectedKeywords: Array.isArray(row.expected_keywords) ? row.expected_keywords.map(String) : undefined,
    };
  });
}

export function listPublishedGeneralQuestions() { return listBank("general_questions"); }
export function listPublishedMcqQuestions() { return listBank("mcq_questions"); }

/** General questions are the primary learning bank used by practice, flashcards and mock interviews. */
export function listPublishedQuestions(): Promise<Question[]> { return listPublishedGeneralQuestions(); }
