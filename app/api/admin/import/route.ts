import { apiError, audit, jsonBody, requireAdmin, AdminApiError } from "@/lib/admin/server";
import { validateRows, type ImportRow, type QuestionBank } from "@/lib/admin/validation";
import { supabaseAdmin } from "@/lib/supabase/server";

type ImportBody = { fileName?: string; format?: "csv" | "json"; rawText?: string; rows?: ImportRow[]; bank?: QuestionBank; skipDuplicates?: boolean; publishImmediately?: boolean };

export async function POST(request: Request) {
  let uploadId: string | null = null;
  let jobId: string | null = null;
  try {
    const admin = await requireAdmin(request);
    const body = await jsonBody<ImportBody>(request);
    if (!body.fileName || !body.rawText || !Array.isArray(body.rows)) throw new AdminApiError("File name, source text, and parsed rows are required.");
    if (body.bank !== "mcq" && body.bank !== "general") throw new AdminApiError("Choose the MCQ or General question bank.");
    if (body.rawText.length > 10_000_000) throw new AdminApiError("Import files must be smaller than 10 MB.");

    const { data: categories, error: categoryError } = await supabaseAdmin!.from("categories").select("id,name,slug");
    if (categoryError) throw categoryError;
    const categoryMap = new Map<string, string>();
    for (const category of categories ?? []) {
      categoryMap.set(category.id.toLowerCase(), category.id);
      categoryMap.set(category.name.toLowerCase(), category.id);
      categoryMap.set(category.slug.toLowerCase(), category.id);
    }
    const validation = validateRows(body.rows, categoryMap, body.bank);
    const targetTable = body.bank === "mcq" ? "mcq_questions" : "general_questions";
    const hashes = validation.valid.map((row) => row.source_hash);
    const existingHashes = new Set<string>();
    for (let offset = 0; offset < hashes.length; offset += 200) {
      const { data: existing, error: duplicateError } = await supabaseAdmin!
        .from(targetTable)
        .select("source_hash")
        .in("source_hash", hashes.slice(offset, offset + 200));
      if (duplicateError) throw duplicateError;
      for (const row of existing ?? []) existingHashes.add(row.source_hash);
    }
    const duplicatesInDatabase = validation.valid
      .filter((row) => existingHashes.has(row.source_hash))
      .map((row) => ({ rowNumber: row.rowNumber, question: row.question_text }));
    const accepted = validation.valid.filter((row) => !existingHashes.has(row.source_hash));
    const duplicateCount = validation.duplicatesInFile.length + duplicatesInDatabase.length;
    if (duplicateCount && !body.skipDuplicates) {
      throw new AdminApiError(
        `${duplicateCount} duplicate question${duplicateCount === 1 ? " was" : "s were"} found. Enable “Skip duplicates” to import the remaining rows.`,
        409,
        { duplicates: [...validation.duplicatesInFile, ...duplicatesInDatabase] },
      );
    }

    uploadId = crypto.randomUUID();
    const storagePath = `${admin.id}/${uploadId}-${body.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error: storageError } = await supabaseAdmin!.storage.from("question-imports").upload(
      storagePath,
      new Blob([body.rawText], { type: body.format === "json" ? "application/json" : "text/csv" }),
      { upsert: false },
    );
    if (storageError) throw new AdminApiError(`Question source upload failed: ${storageError.message}`, 500, storageError);
    const publishImmediately = body.publishImmediately !== false;
    const { data: upload, error: uploadError } = await supabaseAdmin!.from("content_uploads").insert({
      id: uploadId,
      uploaded_by: admin.id,
      file_name: body.fileName,
      storage_path: storagePath,
      mime_type: body.format === "json" ? "application/json" : "text/csv",
      size_bytes: new TextEncoder().encode(body.rawText).length,
      source_format: body.format || "csv",
      status: publishImmediately || !accepted.length ? "completed" : "processing",
      extracted_count: accepted.length,
      invalid_count: validation.invalid.length,
      duplicate_count: duplicateCount,
      metadata: { total_rows: body.rows.length, question_bank: body.bank },
    }).select("id").single();
    if (uploadError) throw uploadError;
    const { data: job, error: jobError } = await supabaseAdmin!.from("ai_processing_jobs").insert({
      upload_id: upload.id,
      requested_by: admin.id,
      stage: publishImmediately || !accepted.length ? "published" : "importing",
      status: publishImmediately || !accepted.length ? "completed" : "queued",
      progress: publishImmediately || !accepted.length ? 100 : 5,
      source_question_count: accepted.length,
      model_provider: "openai",
      model_name: process.env.OPENAI_ADMIN_MODEL || "gpt-4o-mini",
    }).select("id,status,progress").single();
    if (jobError) throw jobError;
    jobId = job.id;

    if (accepted.length) {
      const payload = accepted.map((row) => body.bank === "mcq" ? {
        category_id: row.category_id,
        question_text: row.question_text,
        answer_text: row.answer_text,
        difficulty: row.difficulty,
        tags: row.tags,
        company_asked: row.company_asked,
        options: row.options,
        correct_option: row.correct_option,
        explanation: row.explanation,
        source_hash: row.source_hash,
        import_row_number: row.rowNumber,
        import_job_id: job.id,
        created_by: admin.id,
        review_status: publishImmediately ? "approved" : "pending",
        enrichment_status: publishImmediately ? "ready" : "queued",
        is_published: publishImmediately,
      } : {
        category_id: row.category_id,
        question_text: row.question_text,
        answer_text: row.answer_text,
        question_type: row.question_type,
        difficulty: row.difficulty,
        tags: row.tags,
        company_asked: row.company_asked,
        explanation: row.explanation,
        source_hash: row.source_hash,
        import_row_number: row.rowNumber,
        import_job_id: job.id,
        created_by: admin.id,
        review_status: publishImmediately ? "approved" : "pending",
        enrichment_status: publishImmediately ? "ready" : "queued",
        is_published: publishImmediately,
      });
      for (let offset = 0; offset < payload.length; offset += 200) {
        const { error } = await supabaseAdmin!.from(targetTable).insert(payload.slice(offset, offset + 200));
        if (error) throw new AdminApiError(`Database import failed near row ${accepted[offset]?.rowNumber ?? offset + 2}: ${error.message}`, 500, error);
      }
    }
    await audit(admin.id, "question_import.created", "ai_processing_job", job.id, {
      file: body.fileName,
      accepted: accepted.length,
      invalid: validation.invalid.length,
      duplicates: duplicateCount,
      bank: body.bank,
      published: publishImmediately,
    });
    return Response.json({
      job,
      report: {
        total: body.rows.length,
        accepted: accepted.length,
        invalid: validation.invalid,
        duplicates: [...validation.duplicatesInFile, ...duplicatesInDatabase],
      },
    }, { status: 201 });
  } catch (cause) {
    if (supabaseAdmin && jobId) await supabaseAdmin.from("ai_processing_jobs").update({ status: "failed", stage: "failed" }).eq("id", jobId);
    if (supabaseAdmin && uploadId) await supabaseAdmin.from("content_uploads").update({ status: "failed" }).eq("id", uploadId);
    return apiError(cause);
  }
}
