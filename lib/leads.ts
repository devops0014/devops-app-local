export const leadStatuses = ["new", "interested", "maybe_later", "not_interested"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const leadStatusMeta: Record<LeadStatus, { label: string; tone: "neutral" | "green" | "amber" | "rose"; dot: string }> = {
  new: { label: "Not called yet", tone: "neutral", dot: "bg-zinc-400" },
  interested: { label: "Interested", tone: "green", dot: "bg-emerald-400" },
  maybe_later: { label: "Maybe later", tone: "amber", dot: "bg-amber-400" },
  not_interested: { label: "Not interested", tone: "rose", dot: "bg-rose-400" },
};

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
};

export type LeadActivity = {
  id: string;
  kind: "comment" | "status";
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
