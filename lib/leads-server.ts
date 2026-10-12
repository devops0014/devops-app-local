import { supabaseAdmin } from "@/lib/supabase/server";
import { isLeadStatus, type Lead, type LeadStatus } from "@/lib/leads";

/** Runs `.in()` lookups in chunks so long ID lists stay under URL limits. */
export async function selectIn<T>(
  table: string,
  columns: string,
  column: string,
  values: string[],
  options: { eq?: [string, string]; newestFirst?: boolean } = {},
): Promise<T[]> {
  const rows: T[] = [];
  for (let index = 0; index < values.length; index += 200) {
    let query = supabaseAdmin!.from(table).select(columns).in(column, values.slice(index, index + 200));
    if (options.eq) query = query.eq(options.eq[0], options.eq[1]);
    if (options.newestFirst) query = query.order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
  }
  return rows;
}

type ProfileRow = { id: string; name: string | null; email: string; mobile: string | null; phone_verified_at: string | null; created_at: string };
type LeadRow = { user_id: string; status: string; status_updated_at: string | null; status_updated_by: string | null };
type ActivityRow = { user_id: string; body: string | null; created_at: string };

export async function loadLeads(startIso: string, endIso: string): Promise<Lead[]> {
  const { data: profiles, error } = await supabaseAdmin!.from("profiles")
    .select("id,name,email,mobile,phone_verified_at,created_at")
    .eq("role", "student")
    .gte("created_at", startIso).lt("created_at", endIso)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw error;
  const rows = (profiles ?? []) as ProfileRow[];
  const ids = rows.map((row) => row.id);
  if (!ids.length) return [];

  const [leadRows, comments, quizzes] = await Promise.all([
    selectIn<LeadRow>("leads", "user_id,status,status_updated_at,status_updated_by", "user_id", ids),
    selectIn<ActivityRow>("lead_activity", "user_id,body,created_at", "user_id", ids, { eq: ["kind", "comment"], newestFirst: true }),
    selectIn<{ user_id: string }>("quiz_attempts", "user_id", "user_id", ids),
  ]);
  const updaterIds = [...new Set(leadRows.map((row) => row.status_updated_by).filter((value): value is string => Boolean(value)))];
  const updaters = updaterIds.length ? await selectIn<{ id: string; name: string | null; email: string }>("profiles", "id,name,email", "id", updaterIds) : [];
  const updaterName = new Map(updaters.map((row) => [row.id, row.name || row.email]));
  const leadByUser = new Map(leadRows.map((row) => [row.user_id, row]));
  const quizCount = new Map<string, number>();
  for (const row of quizzes) quizCount.set(row.user_id, (quizCount.get(row.user_id) ?? 0) + 1);
  const notes = new Map<string, { last: ActivityRow; count: number }>();
  for (const row of comments) {
    const current = notes.get(row.user_id);
    notes.set(row.user_id, current ? { ...current, count: current.count + 1 } : { last: row, count: 1 });
  }

  return rows.map((row) => {
    const lead = leadByUser.get(row.id);
    const note = notes.get(row.id);
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      mobile: row.mobile,
      phoneVerified: Boolean(row.phone_verified_at),
      registeredAt: row.created_at,
      status: (isLeadStatus(lead?.status) ? lead!.status : "new") as LeadStatus,
      statusUpdatedAt: lead?.status_updated_at ?? null,
      statusUpdatedBy: lead?.status_updated_by ? updaterName.get(lead.status_updated_by) ?? null : null,
      lastNote: note?.last.body ?? null,
      lastNoteAt: note?.last.created_at ?? null,
      noteCount: note?.count ?? 0,
      quizAttempts: quizCount.get(row.id) ?? 0,
    };
  });
}

export async function requireStudent(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const { data } = await supabaseAdmin!.from("profiles").select("role").eq("id", id).maybeSingle();
  return data?.role === "student";
}
