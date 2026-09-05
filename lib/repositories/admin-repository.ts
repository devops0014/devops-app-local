import { supabase } from "@/lib/supabase/client";

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  question_count: number;
  published_count: number;
  draft_count: number;
};

export type CategoryInput = {
  name: string;
  slug: string;
  color: string;
  icon: string;
  sort_order: number;
};
export type AdminQuestion = {
  id: string;
  bank: "mcq" | "general";
  category_id: string;
  question_text: string;
  answer_text: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  company_asked: string[];
  is_published: boolean;
  review_status: "pending" | "approved" | "rejected";
  enrichment_status: "queued" | "processing" | "ready" | "failed";
  topic?: string | null;
  subtopic?: string | null;
  question_type?: string;
  explanation?: string | null;
  expected_keywords?: string[];
  hints?: string[];
  common_mistakes?: string[];
  follow_up_questions?: string[];
  options?: string[] | null;
  correct_option?: number | null;
  created_at: string;
  categories: { name: string; slug: string } | null;
};

export type QuestionInput = {
  bank?: "mcq" | "general";
  category_id: string;
  question_text: string;
  answer_text: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  company_asked: string[];
  is_published: boolean;
  question_type?: string;
  topic?: string | null;
  subtopic?: string | null;
  options?: string[] | null;
  correct_option?: number | null;
};

async function token() {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error("Admin authentication is required.");
  return data.session.access_token;
}

export async function adminFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}`, ...init.headers },
  });
  const body = await response.json().catch(() => ({})) as T & { error?: string; details?: { details?: string; hint?: string; code?: string } };
  if (!response.ok) {
    const extra = [body.details?.details, body.details?.hint, body.details?.code ? `Code: ${body.details.code}` : ""].filter(Boolean).join(" ");
    throw new Error([body.error || "Administrative request failed.", extra].filter(Boolean).join(" "));
  }
  return body;
}

export async function listAdminQuestions() {
  return (await adminFetch<{ questions: AdminQuestion[] }>("/api/admin/questions")).questions;
}

export async function listAdminCategories() {
  return (await adminFetch<{ categories: AdminCategory[] }>("/api/admin/categories")).categories;
}

export async function createDefaultAdminCategories() {
  return (await adminFetch<{ categories: AdminCategory[] }>("/api/admin/categories", {
    method: "POST",
  })).categories;
}

export async function createAdminCategory(input: CategoryInput) {
  return (await adminFetch<{ category: AdminCategory }>("/api/admin/categories", {
    method: "POST",
    body: JSON.stringify(input),
  })).category;
}

export async function updateAdminCategory(id: string, input: CategoryInput) {
  return (await adminFetch<{ category: AdminCategory }>("/api/admin/categories", {
    method: "PATCH",
    body: JSON.stringify({ id, ...input }),
  })).category;
}

export async function deleteAdminCategory(id: string) {
  return adminFetch<{ deleted: boolean }>(`/api/admin/categories?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function createAdminQuestion(input: QuestionInput) {
  return adminFetch("/api/admin/questions", { method: "POST", body: JSON.stringify(input) });
}

export async function updateAdminQuestion(id: string, input: Partial<QuestionInput> & {
  review_status?: string;
  explanation?: string | null;
  expected_keywords?: string[];
  hints?: string[];
  common_mistakes?: string[];
  follow_up_questions?: string[];
}) {
  return adminFetch("/api/admin/questions", { method: "PATCH", body: JSON.stringify({ id, ...input }) });
}

export async function deleteAdminQuestion(id: string, bank: "mcq" | "general") {
  return adminFetch(`/api/admin/questions?id=${encodeURIComponent(id)}&bank=${bank}`, { method: "DELETE" });
}

export async function importQuestionBank(payload: { fileName: string; format: "csv" | "json"; rawText: string; rows: Record<string, unknown>[]; bank: "mcq" | "general"; skipDuplicates: boolean; publishImmediately: boolean }) {
  return adminFetch<{
    job: { id: string; status: string; progress: number };
    report: {
      total: number;
      accepted: number;
      invalid: Array<{ rowNumber: number; errors: string[] }>;
      duplicates: Array<{ rowNumber: number; question: string }>;
    };
  }>("/api/admin/import", { method: "POST", body: JSON.stringify(payload) });
}

export async function publishAllDraftQuestions() {
  return adminFetch<{ updated: number }>("/api/admin/questions", {
    method: "PATCH",
    body: JSON.stringify({ action: "publish_all_drafts" }),
  });
}

export async function getContentPipeline() {
  return adminFetch<{ jobs: ContentJob[]; review: AdminQuestion[] }>("/api/admin/content");
}

export async function processContentJob(jobId: string) {
  return adminFetch<{ job: ContentJob; remaining: number }>("/api/admin/content", {
    method: "POST", body: JSON.stringify({ jobId }),
  });
}

export type ContentJob = {
  id: string;
  stage: string;
  status: "queued" | "running" | "review" | "completed" | "failed";
  progress: number;
  source_question_count: number;
  generated_count: number;
  error_message?: string | null;
  created_at: string;
  content_uploads?: { file_name?: string } | null;
};

export async function getAdminOverview() {
  return adminFetch<{
    students: AdminStudent[];
    subscriptions: AdminSubscription[];
    logs: AdminLog[];
  }>("/api/admin/overview");
}

export type AdminSubscription = {
  id: string; user_id: string; plan: string; status: string; current_period_end?: string | null;
  cancel_at_period_end?: boolean;
};
export type AdminStudent = {
  id: string; email: string; name?: string | null; mobile?: string | null; subscription_status: string;
  subscription_plan?: string | null; subscription_expires_at?: string | null; created_at: string;
  subscription?: AdminSubscription | null;
  quiz_attempts: number; mock_interviews: number; quiz_average: number; mock_average: number;
  mastery_percent: number; performance_score: number; active_devices: number; last_active?: string | null;
  is_online: boolean;
};
export type AdminLog = {
  id: string; action: string; entity_type: string; entity_id?: string | null;
  metadata: Record<string, unknown>; created_at: string; profiles?: { name?: string; email?: string } | null;
};
