import { createHash, randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

export class AdminApiError extends Error {
  constructor(message: string, public status = 400, public details?: unknown) {
    super(message);
  }
}

export async function requireAdmin(request: Request) {
  if (!supabaseAdmin) throw new AdminApiError("Supabase administration is not configured.", 503);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new AdminApiError("Please sign in as an administrator.", 401);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new AdminApiError("Your session has expired.", 401);
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", data.user.id).single();
  if (profile?.role !== "admin") throw new AdminApiError("Administrator access is required.", 403);
  return data.user;
}

export function sourceHash(question: string, categoryId: string) {
  return createHash("sha256")
    .update(`${categoryId}:${question.trim().toLowerCase().replace(/\s+/g, " ")}`)
    .digest("hex");
}

export async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata: Record<string, unknown> = {},
) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("activity_logs").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata,
    request_id: randomUUID(),
  });
}

export function apiError(cause: unknown) {
  const databaseError = cause && typeof cause === "object"
    ? cause as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    : null;
  const databaseMessage = typeof databaseError?.message === "string" ? databaseError.message : null;
  const databaseDetails = databaseError
    ? {
        details: typeof databaseError.details === "string" ? databaseError.details : undefined,
        hint: typeof databaseError.hint === "string" ? databaseError.hint : undefined,
        code: typeof databaseError.code === "string" ? databaseError.code : undefined,
      }
    : undefined;
  const error = cause instanceof AdminApiError ? cause : new AdminApiError(
    cause instanceof Error ? cause.message : databaseMessage || "Unexpected administrative operation failure.",
    500,
    databaseDetails,
  );
  return Response.json({ error: error.message, details: error.details }, { status: error.status });
}

export async function jsonBody<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    throw new AdminApiError("The request body is not valid JSON.");
  }
}
