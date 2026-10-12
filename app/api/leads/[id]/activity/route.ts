import { AdminApiError, apiError, jsonBody, requirePermission } from "@/lib/admin/server";
import { isLeadStatus, type LeadActivity } from "@/lib/leads";
import { requireStudent } from "@/lib/leads-server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(request, "leads.view");
    const { id } = await context.params;
    if (!(await requireStudent(id))) throw new AdminApiError("Student not found.", 404);
    const { data, error } = await supabaseAdmin!.from("lead_activity")
      .select("id,kind,body,status,created_at,author:profiles!lead_activity_author_id_fkey(name,email)")
      .eq("user_id", id).order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    const activity: LeadActivity[] = (data ?? []).map((row) => {
      const author = (Array.isArray(row.author) ? row.author[0] : row.author) as { name?: string | null; email?: string } | null;
      return {
        id: row.id,
        kind: row.kind === "status" ? "status" : "comment",
        body: row.body,
        status: isLeadStatus(row.status) ? row.status : null,
        createdAt: row.created_at,
        author: author?.name || author?.email || null,
      };
    });
    return Response.json({ activity });
  } catch (cause) {
    return apiError(cause);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission(request, "leads.update");
    const { id } = await context.params;
    if (!(await requireStudent(id))) throw new AdminApiError("Student not found.", 404);
    const body = await jsonBody<{ body?: string }>(request);
    const text = String(body.body ?? "").trim();
    if (!text) throw new AdminApiError("Write a note first.");
    if (text.length > 2000) throw new AdminApiError("Notes can be up to 2000 characters.");

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin!.from("lead_activity")
      .insert({ user_id: id, author_id: user.id, kind: "comment", body: text })
      .select("id,created_at").single();
    if (error) throw error;
    await supabaseAdmin!.from("leads").upsert({ user_id: id, last_contacted_at: now }, { onConflict: "user_id" });
    return Response.json({ id: data.id, createdAt: data.created_at });
  } catch (cause) {
    return apiError(cause);
  }
}
