import { AdminApiError, apiError, audit, jsonBody, requirePermission } from "@/lib/admin/server";
import { isLeadStatus, leadStatusMeta } from "@/lib/leads";
import { requireStudent } from "@/lib/leads-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type Patch = { status?: string; followUpAt?: string | null; assignedTo?: string | null };

/** Update a lead's status, follow-up date and/or owner. Each change is logged. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission(request, "leads.update");
    const { id } = await context.params;
    if (!(await requireStudent(id))) throw new AdminApiError("Student not found.", 404);
    const body = await jsonBody<Patch>(request);
    const now = new Date().toISOString();
    const update: Record<string, unknown> = { user_id: id };
    const activity: Record<string, unknown>[] = [];

    if (body.status !== undefined) {
      if (!isLeadStatus(body.status)) throw new AdminApiError("Invalid status.");
      Object.assign(update, { status: body.status, status_updated_at: now, status_updated_by: user.id, last_contacted_at: now });
      activity.push({ kind: "status", status: body.status });
      // Closing a lead clears its follow-up.
      if (["enrolled", "not_interested"].includes(body.status) && body.followUpAt === undefined) update.follow_up_at = null;
    }
    if (body.followUpAt !== undefined) {
      if (body.followUpAt !== null && !/^\d{4}-\d{2}-\d{2}$/.test(body.followUpAt)) throw new AdminApiError("Invalid follow-up date.");
      update.follow_up_at = body.followUpAt;
      activity.push({ kind: "follow_up", body: body.followUpAt ? `Follow-up set for ${body.followUpAt}` : "Follow-up cleared" });
    }
    if (body.assignedTo !== undefined) {
      if (body.assignedTo !== null) {
        const { data: owner } = await supabaseAdmin!.from("profiles").select("role,name,email").eq("id", body.assignedTo).maybeSingle();
        if (!owner || !["sales", "super_admin"].includes(owner.role)) throw new AdminApiError("Assign to a sales team member.");
        activity.push({ kind: "assigned", body: `Assigned to ${owner.name || owner.email}` });
      } else {
        activity.push({ kind: "assigned", body: "Unassigned" });
      }
      update.assigned_to = body.assignedTo;
    }
    if (!activity.length) throw new AdminApiError("Nothing to update.");

    const { error } = await supabaseAdmin!.from("leads").upsert(update, { onConflict: "user_id" });
    if (error) throw error;
    await supabaseAdmin!.from("lead_activity").insert(activity.map((item) => ({ user_id: id, author_id: user.id, ...item })));
    await audit(user.id, "lead.updated", "lead", id, {
      ...body, statusLabel: body.status && isLeadStatus(body.status) ? leadStatusMeta[body.status].label : undefined,
    });
    return Response.json({ ok: true, updatedAt: now });
  } catch (cause) {
    return apiError(cause);
  }
}
