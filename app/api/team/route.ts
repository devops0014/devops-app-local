import { AdminApiError, apiError, audit, jsonBody, requirePermission } from "@/lib/admin/server";
import { roles, type Role } from "@/lib/rbac";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    await requirePermission(request, "team.manage");
    const { data, error } = await supabaseAdmin!.from("profiles")
      .select("id,name,email,role,created_at")
      .neq("role", "student")
      .order("role").order("created_at");
    if (error) throw error;
    return Response.json({ members: data ?? [] });
  } catch (cause) {
    return apiError(cause);
  }
}

/** Sets the role for an existing account (the person must have signed up first). */
export async function POST(request: Request) {
  try {
    const actor = await requirePermission(request, "team.manage");
    const body = await jsonBody<{ email?: string; role?: string }>(request);
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = body.role as Role;
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new AdminApiError("Enter a valid email address.");
    if (!roles.includes(role)) throw new AdminApiError("Choose a valid role.");

    const { data: target } = await supabaseAdmin!.from("profiles")
      .select("id,name,email,role").eq("email", email).maybeSingle();
    if (!target) throw new AdminApiError("No account with that email. Ask them to sign up first, then add them here.", 404);
    if (target.id === actor.id) throw new AdminApiError("You can't change your own role.", 400);

    const { error } = await supabaseAdmin!.from("profiles")
      .update({ role, updated_at: new Date().toISOString() }).eq("id", target.id);
    if (error) throw error;
    await audit(actor.id, "team.role_changed", "profile", target.id, { from: target.role, to: role });
    return Response.json({ member: { ...target, role } });
  } catch (cause) {
    return apiError(cause);
  }
}
