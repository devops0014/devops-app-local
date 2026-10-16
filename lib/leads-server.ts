import { supabaseAdmin } from "@/lib/supabase/server";
import { engagementScore, isLeadStatus, type Lead, type LeadStatus } from "@/lib/leads";

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

type ProfileRow = {
  id: string; name: string | null; email: string; mobile: string | null; phone_verified_at: string | null; created_at: string;
  phone_verification_method?: string | null;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_content: string | null;
  referrer: string | null; landing_path: string | null;
  experience_level: string | null; job_title: string | null; career_goal: string | null; city: string | null;
  interest_topic?: string | null;
};
type LeadRow = {
  user_id: string; status: string; status_updated_at: string | null; status_updated_by: string | null;
  follow_up_at: string | null; assigned_to: string | null; callback_requested_at: string | null; do_not_contact: boolean | null;
};
type ActivityRow = { user_id: string; body: string | null; created_at: string };

const profileColumns = [
  "id,name,email,mobile,phone_verified_at,phone_verification_method,created_at",
  "utm_source,utm_medium,utm_campaign,utm_content,referrer,landing_path",
  "experience_level,job_title,career_goal,city,interest_topic",
].join(",");

export type LeadQuery =
  | { kind: "registered"; startIso: string; endIso: string }
  | { kind: "followups"; dueOn: string }
  | { kind: "callbacks" };

/** Loads student leads with their call status, notes, source and engagement. */
export async function loadLeads(query: LeadQuery): Promise<Lead[]> {
  let rows: ProfileRow[];
  if (query.kind === "registered") {
    const { data, error } = await supabaseAdmin!.from("profiles").select(profileColumns)
      .eq("role", "student").gte("created_at", query.startIso).lt("created_at", query.endIso)
      .order("created_at", { ascending: false }).limit(5000);
    if (error) throw error;
    rows = (data ?? []) as unknown as ProfileRow[];
  } else {
    let leadQuery = supabaseAdmin!.from("leads").select("user_id").eq("do_not_contact", false).limit(5000);
    leadQuery = query.kind === "followups"
      ? leadQuery.lte("follow_up_at", query.dueOn).not("status", "in", "(enrolled,not_interested)")
      : leadQuery.not("callback_requested_at", "is", null).in("status", ["new", "no_answer", "maybe_later", "interested"]);
    const { data: ids, error } = await leadQuery;
    if (error) throw error;
    const userIds = (ids ?? []).map((row) => row.user_id as string);
    const found = userIds.length ? await selectIn<ProfileRow & { role: string }>("profiles", `${profileColumns},role`, "id", userIds) : [];
    rows = found.filter((row) => row.role === "student").sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const ids = rows.map((row) => row.id);
  if (!ids.length) return [];

  const [leadRows, comments, quizzes, cards, mastered, activity] = await Promise.all([
    selectIn<LeadRow>("leads", "user_id,status,status_updated_at,status_updated_by,follow_up_at,assigned_to,callback_requested_at,do_not_contact", "user_id", ids),
    selectIn<ActivityRow>("lead_activity", "user_id,body,created_at", "user_id", ids, { eq: ["kind", "comment"], newestFirst: true }),
    selectIn<{ user_id: string }>("quiz_attempts", "user_id", "user_id", ids),
    selectIn<{ user_id: string }>("general_flashcard_reviews", "user_id", "user_id", ids),
    selectIn<{ user_id: string }>("general_question_progress", "user_id", "user_id", ids, { eq: ["status", "Mastered"] }),
    selectIn<{ user_id: string }>("daily_activity", "user_id", "user_id", ids),
  ]);

  const staffIds = [...new Set(leadRows.flatMap((row) => [row.status_updated_by, row.assigned_to]).filter((value): value is string => Boolean(value)))];
  const staff = staffIds.length ? await selectIn<{ id: string; name: string | null; email: string }>("profiles", "id,name,email", "id", staffIds) : [];
  const staffName = new Map(staff.map((row) => [row.id, row.name || row.email]));
  const leadByUser = new Map(leadRows.map((row) => [row.user_id, row]));
  const count = (list: { user_id: string }[]) => {
    const map = new Map<string, number>();
    for (const row of list) map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1);
    return map;
  };
  const quizCount = count(quizzes);
  const cardCount = count(cards);
  const masteredCount = count(mastered);
  const activeDays = count(activity);
  const notes = new Map<string, { last: ActivityRow; count: number }>();
  for (const row of comments) {
    const current = notes.get(row.user_id);
    notes.set(row.user_id, current ? { ...current, count: current.count + 1 } : { last: row, count: 1 });
  }

  return rows.map((row) => {
    const lead = leadByUser.get(row.id);
    const note = notes.get(row.id);
    const stats = {
      quizAttempts: quizCount.get(row.id) ?? 0,
      flashcards: cardCount.get(row.id) ?? 0,
      mastered: masteredCount.get(row.id) ?? 0,
      activeDays: activeDays.get(row.id) ?? 0,
    };
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      mobile: row.mobile,
      // Only numbers checked by WhatsApp or a code count as verified.
      phoneVerified: Boolean(row.phone_verified_at) && ["whatsapp", "otp"].includes(row.phone_verification_method ?? "whatsapp"),
      registeredAt: row.created_at,
      status: (isLeadStatus(lead?.status) ? lead!.status : "new") as LeadStatus,
      statusUpdatedAt: lead?.status_updated_at ?? null,
      statusUpdatedBy: lead?.status_updated_by ? staffName.get(lead.status_updated_by) ?? null : null,
      lastNote: note?.last.body ?? null,
      lastNoteAt: note?.last.created_at ?? null,
      noteCount: note?.count ?? 0,
      ...stats,
      score: engagementScore({ ...stats, callbackRequested: Boolean(lead?.callback_requested_at) }),
      followUpAt: lead?.follow_up_at ?? null,
      assignedTo: lead?.assigned_to ?? null,
      assignedToName: lead?.assigned_to ? staffName.get(lead.assigned_to) ?? null : null,
      callbackRequestedAt: lead?.callback_requested_at ?? null,
      doNotContact: Boolean(lead?.do_not_contact),
      source: {
        utmSource: row.utm_source, utmMedium: row.utm_medium, utmCampaign: row.utm_campaign,
        utmContent: row.utm_content, referrer: row.referrer, landingPath: row.landing_path,
      },
      profile: { experience: row.experience_level, jobTitle: row.job_title, goal: row.career_goal, city: row.city, interestTopic: row.interest_topic ?? null },
    };
  });
}

/** Staff who can work leads, for the assignment dropdown. */
export async function loadCallers() {
  const { data, error } = await supabaseAdmin!.from("profiles")
    .select("id,name,email").in("role", ["sales", "super_admin"]).order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id as string, name: (row.name as string | null) || (row.email as string) }));
}

export async function requireStudent(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const { data } = await supabaseAdmin!.from("profiles").select("role").eq("id", id).maybeSingle();
  return data?.role === "student";
}
