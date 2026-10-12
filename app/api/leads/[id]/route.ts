import { AdminApiError, apiError, audit, jsonBody, requirePermission } from "@/lib/admin/server";
import { isLeadStatus } from "@/lib/leads";
import { requireStudent } from "@/lib/leads-server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission(request, "leads.update");
    const { id } = await context.params;
    if (!(await requireStudent(id))) throw new AdminApiError("Student not found.", 404);
    const body = await jsonBody<{ status?: string }>(request);
    if (!isLeadStatus(body.status)) throw new AdminApiError("Invalid status.");

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin!.from("leads").upsert({
      user_id: id,
      status: body.status,
      status_updated_at: now,
      status_updated_by: user.id,
      last_contacted_at: now,
    }, { onConflict: "user_id" });
    if (error) throw error;
    await supabaseAdmin!.from("lead_activity").insert({ user_id: id, author_id: user.id, kind: "status", status: body.status });
    await audit(user.id, "lead.status_changed", "lead", id, { status: body.status });
    return Response.json({ status: body.status, statusUpdatedAt: now });
  } catch (cause) {
    return apiError(cause);
  }
}
