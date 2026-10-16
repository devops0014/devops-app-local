import { AdminApiError, apiError, audit, requirePermission } from "@/lib/admin/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Blocked wrong-number list (super admin). */
export async function GET(request: Request) {
  try {
    await requirePermission(request, "team.manage");
    const { data, error } = await supabaseAdmin!.from("blocked_contacts")
      .select("id,email,phone,name,reason,note,blocked_at,blocker:profiles!blocked_contacts_blocked_by_fkey(name,email)")
      .order("blocked_at", { ascending: false }).limit(500);
    if (error) throw error;
    return Response.json({
      blocked: (data ?? []).map((row) => {
        const blocker = (Array.isArray(row.blocker) ? row.blocker[0] : row.blocker) as { name?: string | null; email?: string } | null;
        return { ...row, blocker: undefined, blockedBy: blocker?.name || blocker?.email || null };
      }),
    });
  } catch (cause) {
    return apiError(cause);
  }
}

/** Unblock: lets that email/number sign up again (the old account stays deleted). */
export async function DELETE(request: Request) {
  try {
    const actor = await requirePermission(request, "team.manage");
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AdminApiError("Invalid entry.");
    const { data: row } = await supabaseAdmin!.from("blocked_contacts").select("email,phone").eq("id", id).maybeSingle();
    const { error } = await supabaseAdmin!.from("blocked_contacts").delete().eq("id", id);
    if (error) throw error;
    await audit(actor.id, "lead.unblocked", "blocked_contact", id, row ?? {});
    return Response.json({ ok: true });
  } catch (cause) {
    return apiError(cause);
  }
}
