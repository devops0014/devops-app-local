export const leadStatuses = ["new", "no_answer", "interested", "maybe_later", "not_interested", "enrolled"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const leadStatusMeta: Record<LeadStatus, { label: string; tone: "neutral" | "green" | "amber" | "rose" | "cyan" | "violet"; dot: string }> = {
  new: { label: "Not called yet", tone: "neutral", dot: "bg-zinc-400" },
  no_answer: { label: "No answer", tone: "cyan", dot: "bg-sky-400" },
  interested: { label: "Interested", tone: "green", dot: "bg-emerald-400" },
  maybe_later: { label: "Maybe later", tone: "amber", dot: "bg-amber-400" },
  not_interested: { label: "Not interested", tone: "rose", dot: "bg-rose-400" },
  enrolled: { label: "Enrolled", tone: "violet", dot: "bg-violet-400" },
};

export const experienceLabels: Record<string, string> = {
  student: "Student / fresher",
  "0-1": "Under 1 year",
  "1-3": "1–3 years",
  "3-5": "3–5 years",
  "5+": "5+ years",
};

export const goalLabels: Record<string, string> = {
  first_job: "First DevOps job",
  switch: "Switch into DevOps",
  upskill: "Upskill in current role",
  promotion: "Better package / promotion",
};

/** Simple engagement score: how much the student actually uses the app. */
export function engagementScore(input: { quizAttempts: number; flashcards: number; mastered: number; activeDays: number; callbackRequested: boolean }) {
  return Math.min(100, Math.round(
    input.quizAttempts * 8 + input.flashcards * 1 + input.mastered * 2 + input.activeDays * 6 + (input.callbackRequested ? 40 : 0),
  ));
}

export function heatLabel(score: number) {
  if (score >= 60) return { label: "Hot", className: "border-rose-400/30 bg-rose-400/10 text-rose-200" };
  if (score >= 25) return { label: "Warm", className: "border-amber-400/30 bg-amber-400/10 text-amber-200" };
  return { label: "Cold", className: "border-white/10 bg-white/[.04] text-zinc-400" };
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return leadStatuses.includes(value as LeadStatus);
}

export type Lead = {
  id: string;
  name: string | null;
  email: string;
  mobile: string | null;
  phoneVerified: boolean;
  registeredAt: string;
  status: LeadStatus;
  statusUpdatedAt: string | null;
  statusUpdatedBy: string | null;
  lastNote: string | null;
  lastNoteAt: string | null;
  noteCount: number;
  quizAttempts: number;
  flashcards: number;
  mastered: number;
  activeDays: number;
  score: number;
  followUpAt: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  callbackRequestedAt: string | null;
  doNotContact: boolean;
  source: { utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; utmContent: string | null; referrer: string | null; landingPath: string | null };
  profile: { experience: string | null; jobTitle: string | null; goal: string | null; city: string | null; interestTopic: string | null };
};

/** Human label for where a lead came from. */
export function sourceLabel(source: Lead["source"]) {
  if (source.utmSource) return source.utmCampaign ? `${source.utmSource} · ${source.utmCampaign}` : source.utmSource;
  if (source.referrer) {
    try { return new URL(source.referrer).hostname.replace(/^www\./, ""); } catch { return "referral"; }
  }
  return "direct";
}

export type LeadActivityKind = "comment" | "status" | "follow_up" | "assigned" | "callback_request" | "opt_out";

export type LeadActivity = {
  id: string;
  kind: LeadActivityKind;
  body: string | null;
  status: LeadStatus | null;
  createdAt: string;
  author: string | null;
};

/** India Standard Time has no daylight saving, so a fixed offset is exact. */
export const IST_OFFSET = "+05:30";

/** Today's date in IST as YYYY-MM-DD. */
export function istToday(now = new Date()) {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

export function istShift(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Inclusive IST day range → [startIso, endExclusiveIso] in UTC. */
export function istRange(from: string, to: string) {
  return [
    new Date(`${from}T00:00:00${IST_OFFSET}`).toISOString(),
    new Date(`${istShift(to, 1)}T00:00:00${IST_OFFSET}`).toISOString(),
  ] as const;
}

export function formatIst(iso: string, options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }) {
  return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...options });
}

/** Normalises an Indian or international number to E.164 (+919876543210). */
export function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^\+\d{10,15}$/.test(digits)) return digits;
  const bare = digits.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(bare)) return `+91${bare}`;
  if (/^0[6-9]\d{9}$/.test(bare)) return `+91${bare.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(bare)) return `+${bare}`;
  return null;
}

/** "github-actions" → "GitHub Actions" for display. */
export function topicLabel(slug: string | null | undefined) {
  if (!slug) return null;
  const known: Record<string, string> = { aws: "AWS", argocd: "ArgoCD", "github-actions": "GitHub Actions" };
  return known[slug] ?? slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
