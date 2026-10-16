import { AdminApiError, apiError, audit, jsonBody, requirePermission } from "@/lib/admin/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const reasons = ["unreachable", "someone_else", "fake"] as const;
type Reason = (typeof reasons)[number];

/**
 * Wrong mobile number: remember the email + number on the blocked list, then
 * delete the student's account (all their data goes with it). The caller then
 * sends the formal notice email from the dashboard.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission(request, "leads.block");
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AdminApiError("Student not found.", 404);
    const body = await jsonBody<{ reason?: string; note?: string }>(request);
    if (!reasons.includes(body.reason as Reason)) throw new AdminApiError("Choose why the number is wrong.");
    const note = String(body.note ?? "").trim().slice(0, 500) || null;

    const { data: student } = await supabaseAdmin!.from("profiles").select("id,role,name,email,mobile").eq("id", id).maybeSingle();
    if (!student || student.role !== "student") throw new AdminApiError("Only student accounts can be removed here.", 404);

    const { error: listError } = await supabaseAdmin!.from("blocked_contacts").insert({
      email: student.email?.toLowerCase() ?? null,
      phone: student.mobile,
      name: student.name,
      reason: body.reason,
      note,
      blocked_by: actor.id,
    });
    if (listError) throw listError;

    const { error: deleteError } = await supabaseAdmin!.auth.admin.deleteUser(id);
    if (deleteError) throw new AdminApiError(`Could not remove the account: ${deleteError.message}`, 500);

    await audit(actor.id, "lead.blocked_wrong_number", "profile", id, {
      email: student.email, phone: student.mobile, reason: body.reason, note,
    });
    return Response.json({ blocked: true, name: student.name, email: student.email, phone: student.mobile });
  } catch (cause) {
    return apiError(cause);
  }
}
