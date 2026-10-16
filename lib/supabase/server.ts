import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseAdminConfigured = Boolean(url && serviceRoleKey);

export const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(url!, serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export async function requireUser(request: Request) {
  if (!supabaseAdmin) {
    throw new ApiError("Account services are not configured yet.", 503);
  }
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new ApiError("Please sign in to continue.", 401);

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new ApiError("Your session has expired. Please sign in again.", 401);
  return data.user;
}

export class ApiError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
