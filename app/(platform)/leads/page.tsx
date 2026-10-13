"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BadgeCheck, BellRing, CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Download, Flame, LoaderCircle, Mail,
  MessageCircle, MessageSquareText, Phone, PhoneOff, RefreshCw, Search, Send, UserRound, UsersRound, X,
} from "lucide-react";
import { RoleGate } from "@/components/access-gate";
import { Badge, Button, Card } from "@/components/ui";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import {
  experienceLabels, formatIst, goalLabels, heatLabel, istShift, istToday, leadStatuses, leadStatusMeta, sourceLabel, topicLabel,
  type Lead, type LeadActivity, type LeadStatus,
} from "@/lib/leads";
import { can } from "@/lib/rbac";
import {
  addLeadNote, downloadLeadsCsv, listLeadActivity, listLeads, updateLead,
  type Caller, type LeadCounts, type LeadFilters, type LeadPatch, type LeadView,
} from "@/lib/repositories/leads-repository";
import { cn } from "@/lib/utils";

type Preset = "today" | "yesterday" | "day" | "7d" | "30d" | "custom";

const presets: { id: Preset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "custom", label: "Custom" },
];

const views: { id: LeadView; label: string; icon: typeof UsersRound; hint: string }[] = [
  { id: "registered", label: "New sign-ups", icon: UsersRound, hint: "Students who registered in the chosen dates" },
  { id: "followups", label: "Follow-ups due", icon: CalendarClock, hint: "Call-backs scheduled for today or overdue" },
  { id: "callbacks", label: "Callback requests", icon: BellRing, hint: "Students who asked us to call them" },
];

export default function LeadsPage() {
  return <RoleGate permission="leads.view"><LeadsDashboard /></RoleGate>;
}

function LeadsDashboard() {
  const { profile } = useCurrentUser();
  const today = istToday();
  const [view, setView] = useState<LeadView>("registered");
  const [preset, setPreset] = useState<Preset>("today");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState<"all" | LeadStatus>("all");
  const [verified, setVerified] = useState("all");
  const [owner, setOwner] = useState("all");
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState<"recent" | "hot">("recent");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<LeadCounts | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [callers, setCallers] = useState<Caller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const canUpdate = can(profile?.role, "leads.update");
  const canExport = can(profile?.role, "leads.export");
  const filters: LeadFilters = useMemo(
    () => ({ view, from, to, status, verified, q, owner, source, sort }),
    [view, from, to, status, verified, q, owner, source, sort],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setQ(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listLeads(filters);
      setLeads(result.leads);
      setCounts(result.counts);
      setSources(result.sources);
      setCallers(result.callers);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load leads.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  const choosePreset = (next: Preset) => {
    setPreset(next);
    if (next === "today") { setFrom(today); setTo(today); }
    if (next === "yesterday") { const day = istShift(today, -1); setFrom(day); setTo(day); }
    if (next === "7d") { setFrom(istShift(today, -6)); setTo(today); }
    if (next === "30d") { setFrom(istShift(today, -29)); setTo(today); }
  };

  const stepDay = (days: number) => {
    const day = istShift(from, days);
    if (day > today) return;
    setFrom(day);
    setTo(day);
    setPreset(day === today ? "today" : day === istShift(today, -1) ? "yesterday" : "day");
  };

  const singleDay = from === to;
  const rangeLabel = view === "followups" ? `Due on or before ${formatIst(`${today}T12:00:00+05:30`, { day: "numeric", month: "long" })}`
    : view === "callbacks" ? "Open callback requests, newest first"
    : singleDay
      ? formatIst(`${from}T12:00:00+05:30`, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : `${formatIst(`${from}T12:00:00+05:30`, { day: "numeric", month: "short" })} – ${formatIst(`${to}T12:00:00+05:30`, { day: "numeric", month: "short", year: "numeric" })}`;

  /** Optimistic update for status / follow-up / owner, rolled back on failure. */
  const patchLead = async (id: string, patch: LeadPatch) => {
    const previous = leads.find((lead) => lead.id === id);
    if (!previous) return;
    const optimistic: Lead = {
      ...previous,
      ...(patch.status ? { status: patch.status, statusUpdatedBy: profile?.name ?? "You", statusUpdatedAt: new Date().toISOString() } : {}),
      ...(patch.status && ["enrolled", "not_interested"].includes(patch.status) && patch.followUpAt === undefined ? { followUpAt: null } : {}),
      ...(patch.followUpAt !== undefined ? { followUpAt: patch.followUpAt } : {}),
      ...(patch.assignedTo !== undefined ? { assignedTo: patch.assignedTo, assignedToName: callers.find((item) => item.id === patch.assignedTo)?.name ?? null } : {}),
    };
    setLeads((items) => items.map((lead) => lead.id === id ? optimistic : lead));
    if (patch.status && patch.status !== previous.status) {
      setCounts((value) => value && { ...value, [previous.status]: value[previous.status] - 1, [patch.status!]: value[patch.status!] + 1 });
    }
    try {
      await updateLead(id, patch);
    } catch (cause) {
      setLeads((items) => items.map((lead) => lead.id === id ? previous : lead));
      if (patch.status && patch.status !== previous.status) {
        setCounts((value) => value && { ...value, [previous.status]: value[previous.status] + 1, [patch.status!]: value[patch.status!] - 1 });
      }
      setError(cause instanceof Error ? cause.message : "Could not update the lead.");
      throw cause;
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try { await downloadLeadsCsv(filters); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Export failed."); }
    finally { setExporting(false); }
  };

  const openLead = leads.find((lead) => lead.id === openId) ?? null;
  const total = counts?.total ?? 0;
  const kpis: { key: "all" | LeadStatus; label: string; value: number; dot: string }[] = [
    { key: "all", label: "All", value: total, dot: "bg-violet-400" },
    ...leadStatuses.map((key) => ({ key, label: leadStatusMeta[key].label, value: counts?.[key] ?? 0, dot: leadStatusMeta[key].dot })),
  ];

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge tone="violet"><UsersRound size={12} className="mr-1" /> Leads</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Students to call</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400"><CalendarDays size={14} /> {rangeLabel} · IST</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void load()} disabled={loading} aria-label="Refresh"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</Button>
          {canExport && <Button variant="secondary" onClick={() => void exportCsv()} disabled={exporting || !leads.length}><Download size={14} /> {exporting ? "Exporting…" : "Export CSV"}</Button>}
        </div>
      </div>

      {/* View tabs */}
      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        {views.map((item) => (
          <button key={item.id} onClick={() => { setView(item.id); setStatus("all"); }} className={cn(
            "flex items-center gap-3 rounded-2xl border p-3.5 text-left transition",
            view === item.id ? "border-violet-400/50 bg-violet-400/[.08]" : "border-white/[.07] bg-[var(--panel)] hover:border-white/[.15]",
          )}>
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", view === item.id ? "bg-violet-400/15 text-violet-200" : "bg-white/[.04] text-zinc-400")}><item.icon size={18} /></span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-zinc-100">{item.label}</span>
              <span className="block truncate text-xs text-zinc-500">{item.hint}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Date controls (sign-ups view only) */}
      {view === "registered" && (
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex overflow-x-auto rounded-xl border border-white/[.07] bg-white/[.025] p-1">
            {presets.map((item) => (
              <button key={item.id} onClick={() => choosePreset(item.id)} className={cn("shrink-0 rounded-lg px-3 py-2 text-sm transition", preset === item.id ? "bg-white/[.08] text-white" : "text-zinc-400 hover:text-zinc-200")}>{item.label}</button>
            ))}
          </div>
          {preset === "custom" ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <input type="date" value={from} max={to} onChange={(event) => event.target.value && setFrom(event.target.value)} className="h-10 rounded-xl border border-white/[.08] bg-[var(--panel)] px-3 text-sm text-zinc-200" />
              <span>to</span>
              <input type="date" value={to} min={from} max={today} onChange={(event) => event.target.value && setTo(event.target.value)} className="h-10 rounded-xl border border-white/[.08] bg-[var(--panel)] px-3 text-sm text-zinc-200" />
            </div>
          ) : singleDay && (
            <div className="flex items-center gap-1">
              <button onClick={() => stepDay(-1)} className="grid size-10 place-items-center rounded-xl border border-white/[.08] text-zinc-400 hover:text-white" aria-label="Previous day"><ChevronLeft size={16} /></button>
              <input type="date" value={from} max={today} onChange={(event) => { if (!event.target.value) return; setFrom(event.target.value); setTo(event.target.value); setPreset(event.target.value === today ? "today" : "day"); }} className="h-10 rounded-xl border border-white/[.08] bg-[var(--panel)] px-3 text-sm text-zinc-200" aria-label="Pick a day" />
              <button onClick={() => stepDay(1)} disabled={from >= today} className="grid size-10 place-items-center rounded-xl border border-white/[.08] text-zinc-400 hover:text-white disabled:opacity-30" aria-label="Next day"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      )}

      {/* Status cards */}
      <section className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-7 lg:overflow-visible">
        {kpis.map((item) => {
          const active = status === item.key;
          const percent = total && item.key !== "all" ? Math.round(item.value / total * 100) : null;
          return (
            <button key={item.key} onClick={() => setStatus(item.key)} className={cn("min-w-[132px] rounded-2xl border bg-[var(--panel)] p-3.5 text-left transition", active ? "border-violet-400/45 shadow-[0_0_0_1px_rgba(167,139,250,.22)]" : "border-white/[.07] hover:border-white/[.14]")}>
              <span className="flex items-center gap-2 text-xs text-zinc-400"><i className={cn("size-2 rounded-full", item.dot)} />{item.label}</span>
              <span className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">{loading && !counts ? "–" : item.value}</span>
                {percent !== null && <span className="text-xs text-zinc-500">{percent}%</span>}
              </span>
              {item.key === "all" && counts && <span className="mt-0.5 block text-xs text-rose-300/90">{counts.hot} hot · {counts.verified} verified</span>}
            </button>
          );
        })}
      </section>

      {/* Toolbar */}
      <div className="mt-4 flex flex-col gap-2 lg:flex-row">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-white/[.08] bg-[var(--panel)] px-3">
          <Search size={15} className="text-zinc-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone or city" className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-zinc-500" />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={sort} onChange={(value) => setSort(value as "recent" | "hot")} label="Sort">
            <option value="recent">Newest first</option>
            <option value="hot">Hottest first</option>
          </Select>
          <Select value={owner} onChange={setOwner} label="Owner">
            <option value="all">All owners</option>
            <option value="me">My leads</option>
            <option value="unassigned">Unassigned</option>
            {callers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select value={source} onChange={setSource} label="Source">
            <option value="all">All sources</option>
            {sources.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Select value={verified} onChange={setVerified} label="Number">
            <option value="all">All numbers</option>
            <option value="yes">WhatsApp verified</option>
            <option value="no">Not verified</option>
          </Select>
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/[.05] p-3 text-sm text-rose-300">{error}</p>}

      {/* Lead list */}
      <Card className="mt-4 overflow-hidden">
        <div className="hidden grid-cols-[1.35fr_1.15fr_.95fr_1.05fr_1.2fr] gap-4 border-b border-white/[.06] px-5 py-3 text-xs uppercase tracking-[.1em] text-zinc-500 xl:grid">
          <span>Student</span><span>Contact</span><span>Signal</span><span>Status</span><span>Latest note</span>
        </div>
        {loading && !leads.length ? (
          <div className="grid min-h-64 place-items-center"><LoaderCircle className="animate-spin text-violet-400" /></div>
        ) : !leads.length ? (
          <div className="grid min-h-64 place-items-center p-6 text-center">
            <div>
              <UsersRound size={30} className="mx-auto text-zinc-600" />
              <p className="mt-3 text-base text-zinc-200">{view === "followups" ? "No follow-ups due" : view === "callbacks" ? "No open callback requests" : "No students here yet"}</p>
              <p className="mt-1 text-sm text-zinc-500">{status !== "all" || q || verified !== "all" || owner !== "all" || source !== "all" ? "Try clearing the filters." : view === "registered" ? "New registrations for this date will appear here." : "You're all caught up."}</p>
            </div>
          </div>
        ) : leads.map((lead) => (
          <LeadRow key={lead.id} lead={lead} today={today} canUpdate={canUpdate} onStatus={(next) => void patchLead(lead.id, { status: next }).catch(() => undefined)} onOpen={() => setOpenId(lead.id)} />
        ))}
      </Card>
      {leads.length > 0 && <p className="mt-3 text-xs text-zinc-500">Showing {leads.length} of {total} students</p>}

      <LeadDrawer
        lead={openLead}
        today={today}
        callers={callers}
        canUpdate={canUpdate}
        onClose={() => setOpenId(null)}
        onPatch={(patch) => openLead ? patchLead(openLead.id, patch) : Promise.resolve()}
        onNoteAdded={(body) => openLead && setLeads((items) => items.map((lead) => lead.id === openLead.id ? { ...lead, lastNote: body, lastNoteAt: new Date().toISOString(), noteCount: lead.noteCount + 1 } : lead))}
      />
    </div>
  );
}

function Select({ value, onChange, label, children }: { value: string; onChange: (value: string) => void; label: string; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className="h-10 min-w-0 rounded-xl border border-white/[.08] bg-[var(--panel)] px-3 text-sm text-zinc-200">
      {children}
    </select>
  );
}

function HeatBadge({ score }: { score: number }) {
  const heat = heatLabel(score);
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", heat.className)}>{heat.label === "Hot" && <Flame size={11} />}{heat.label}</span>;
}

function FollowUpChip({ date, today }: { date: string; today: string }) {
  const overdue = date < today;
  const label = date === today ? "Call today" : overdue ? `Overdue · ${formatIst(`${date}T12:00:00+05:30`, { day: "numeric", month: "short" })}` : `Call on ${formatIst(`${date}T12:00:00+05:30`, { day: "numeric", month: "short" })}`;
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs", overdue ? "border-rose-400/30 text-rose-200" : date === today ? "border-amber-400/30 text-amber-200" : "border-white/10 text-zinc-300")}><CalendarClock size={11} />{label}</span>;
}

function LeadRow({ lead, today, canUpdate, onStatus, onOpen }: { lead: Lead; today: string; canUpdate: boolean; onStatus: (status: LeadStatus) => void; onOpen: () => void }) {
  return (
    <div className={cn("grid gap-3 border-b border-white/[.05] px-4 py-4 last:border-0 hover:bg-white/[.015] sm:px-5 xl:grid-cols-[1.35fr_1.15fr_.95fr_1.05fr_1.2fr] xl:items-center xl:gap-4", lead.doNotContact && "opacity-60")}>
      <button onClick={onOpen} className="flex min-w-0 items-center gap-3 text-left">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-sm font-semibold text-violet-300">{initials(lead.name || lead.email)}</span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-medium text-zinc-100">{lead.name || "Unnamed student"}</span>
          <span className="mt-0.5 block truncate text-xs text-zinc-400">
            {[topicLabel(lead.profile.interestTopic), lead.profile.experience && experienceLabels[lead.profile.experience], lead.profile.city].filter(Boolean).join(" · ") || lead.email}
          </span>
        </span>
      </button>
      <ContactActions lead={lead} />
      <div className="flex flex-wrap items-center gap-1.5">
        <HeatBadge score={lead.score} />
        {lead.callbackRequestedAt && <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-xs text-violet-200"><BellRing size={11} /> Wants a call</span>}
        <span className="truncate rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400" title="Where they came from">{sourceLabel(lead.source)}</span>
      </div>
      <div>
        <StatusSelect value={lead.status} disabled={!canUpdate || lead.doNotContact} onChange={onStatus} />
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {lead.followUpAt && <FollowUpChip date={lead.followUpAt} today={today} />}
          {lead.assignedToName && <span className="inline-flex items-center gap-1 text-xs text-zinc-500"><UserRound size={11} /> {lead.assignedToName}</span>}
        </div>
      </div>
      <button onClick={onOpen} className="flex min-w-0 items-start gap-2 rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-2.5 text-left hover:border-white/[.12]">
        <MessageSquareText size={15} className="mt-0.5 shrink-0 text-zinc-500" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-zinc-300">{lead.doNotContact ? "Do not contact — consent withdrawn" : lead.lastNote ?? (canUpdate ? "Add a note…" : "No notes yet")}</span>
          {lead.noteCount > 0 && <span className="text-xs text-zinc-500">{lead.noteCount} note{lead.noteCount === 1 ? "" : "s"}</span>}
        </span>
      </button>
    </div>
  );
}

function ContactActions({ lead }: { lead: Lead }) {
  if (lead.doNotContact) return <span className="inline-flex items-center gap-1.5 text-sm text-rose-300"><PhoneOff size={14} /> Do not contact</span>;
  if (!lead.mobile) return <span className="text-sm text-zinc-500">No phone</span>;
  const digits = lead.mobile.replace(/\D/g, "");
  return (
    <div className="flex items-center gap-2">
      <a href={`tel:${lead.mobile}`} className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-zinc-100 hover:text-white">
        <Phone size={14} className="shrink-0 text-emerald-300" /> <span className="truncate">{lead.mobile}</span>
      </a>
      {lead.phoneVerified
        ? <BadgeCheck size={16} className="shrink-0 text-emerald-400" aria-label="WhatsApp verified" />
        : <span className="shrink-0 rounded-full border border-amber-400/20 px-1.5 text-xs text-amber-300">unverified</span>}
      <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20" aria-label="Open WhatsApp chat"><MessageCircle size={15} /></a>
    </div>
  );
}

function StatusSelect({ value, disabled, onChange }: { value: LeadStatus; disabled?: boolean; onChange: (status: LeadStatus) => void }) {
  const tones: Record<LeadStatus, string> = {
    new: "border-white/10 text-zinc-200",
    no_answer: "border-sky-400/30 bg-sky-400/[.07] text-sky-200",
    interested: "border-emerald-400/30 bg-emerald-400/[.07] text-emerald-200",
    maybe_later: "border-amber-400/30 bg-amber-400/[.07] text-amber-200",
    not_interested: "border-rose-400/30 bg-rose-400/[.07] text-rose-200",
    enrolled: "border-violet-400/40 bg-violet-400/[.1] text-violet-100",
  };
  return (
    <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as LeadStatus)} className={cn("h-10 w-full max-w-[200px] rounded-lg border bg-[var(--panel)] px-2.5 text-sm disabled:opacity-70", tones[value])} aria-label="Call status">
      {leadStatuses.map((key) => <option key={key} value={key}>{leadStatusMeta[key].label}</option>)}
    </select>
  );
}

function LeadDrawer({ lead, today, callers, canUpdate, onClose, onPatch, onNoteAdded }: {
  lead: Lead | null; today: string; callers: Caller[]; canUpdate: boolean; onClose: () => void;
  onPatch: (patch: LeadPatch) => Promise<void>; onNoteAdded: (body: string) => void;
}) {
  const [activity, setActivity] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const leadId = lead?.id;

  useEffect(() => {
    if (!leadId) return;
    let active = true;
    setLoading(true);
    setError("");
    listLeadActivity(leadId)
      .then((rows) => { if (active) setActivity(rows); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load history."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [leadId, reloadKey]);

  const apply = async (patch: LeadPatch) => {
    try {
      await onPatch(patch);
      setReloadKey((value) => value + 1);
    } catch {
      // The dashboard shows the error.
    }
  };

  const pickStatus = (status: LeadStatus) => {
    if (!lead || lead.status === status) return;
    // "Maybe later" / "No answer" without a date → suggest calling again soon.
    const suggestion = !lead.followUpAt && status === "maybe_later" ? istShift(today, 7) : !lead.followUpAt && status === "no_answer" ? istShift(today, 1) : undefined;
    void apply(suggestion ? { status, followUpAt: suggestion } : { status });
  };

  const save = async () => {
    if (!lead || !note.trim()) return;
    setSaving(true);
    setError("");
    try {
      const body = note.trim();
      const result = await addLeadNote(lead.id, body);
      setActivity((rows) => [{ id: result.id, kind: "comment", body, status: null, createdAt: result.createdAt, author: "You" }, ...rows]);
      onNoteAdded(body);
      setNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the note.");
    } finally {
      setSaving(false);
    }
  };

  const locked = !canUpdate || Boolean(lead?.doNotContact);

  return (
    <Dialog.Root open={Boolean(lead)} onOpenChange={(open) => { if (!open) { onClose(); setNote(""); setActivity([]); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[90] flex w-full max-w-lg flex-col border-l border-white/10 bg-[var(--panel)] shadow-[0_0_120px_rgba(0,0,0,.5)]">
          {lead && <>
            <div className="overflow-y-auto border-b border-white/[.07] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Dialog.Title className="truncate text-xl font-semibold tracking-[-.03em]">{lead.name || "Unnamed student"}</Dialog.Title>
                  <Dialog.Description className="mt-1 flex items-center gap-1.5 truncate text-sm text-zinc-400"><Mail size={13} /> {lead.email}</Dialog.Description>
                </div>
                <Dialog.Close className="grid size-9 shrink-0 place-items-center rounded-xl text-zinc-400 hover:bg-white/[.06]" aria-label="Close"><X size={18} /></Dialog.Close>
              </div>
              <div className="mt-4"><ContactActions lead={lead} /></div>

              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-white/[.07] bg-white/[.02] p-4 text-sm">
                <Fact label="Experience" value={lead.profile.experience ? experienceLabels[lead.profile.experience] : null} />
                <Fact label="Goal" value={lead.profile.goal ? goalLabels[lead.profile.goal] : null} />
                <Fact label="Current role" value={lead.profile.jobTitle} />
                <Fact label="City" value={lead.profile.city} />
                <Fact label="Interested in" value={topicLabel(lead.profile.interestTopic)} />
                <Fact label="Came from" value={sourceLabel(lead.source)} />
                <Fact label="Registered" value={formatIst(lead.registeredAt)} wide />
                <Fact label="Activity" value={`${lead.quizAttempts} quizzes · ${lead.flashcards} cards · ${lead.activeDays} days active`} wide />
              </dl>
              <div className="mt-3 flex items-center gap-2"><HeatBadge score={lead.score} /><span className="text-xs text-zinc-500">Engagement score {lead.score}/100</span></div>

              {lead.doNotContact && <p className="mt-4 flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] p-3 text-sm text-rose-200"><PhoneOff size={15} /> This student withdrew consent. Don't call or message them.</p>}

              <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-[.12em] text-zinc-500">Call status</p>
              <div className="grid grid-cols-2 gap-2">
                {leadStatuses.map((key) => (
                  <button key={key} disabled={locked} onClick={() => pickStatus(key)} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-60", lead.status === key ? "border-violet-400/50 bg-violet-400/[.1] text-white" : "border-white/[.08] text-zinc-300 hover:border-white/[.16]")}>
                    <i className={cn("size-2 rounded-full", leadStatusMeta[key].dot)} /> {leadStatusMeta[key].label}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-[.12em] text-zinc-500">Call again on</span>
                  <div className="flex gap-1.5">
                    <input type="date" min={today} disabled={locked} value={lead.followUpAt ?? ""} onChange={(event) => void apply({ followUpAt: event.target.value || null })} className="h-10 min-w-0 flex-1 rounded-lg border border-white/[.08] bg-white/[.03] px-2.5 text-sm text-zinc-200 disabled:opacity-60" />
                    {lead.followUpAt && !locked && <button onClick={() => void apply({ followUpAt: null })} className="h-10 rounded-lg border border-white/[.08] px-2.5 text-xs text-zinc-400 hover:text-white">Clear</button>}
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-[.12em] text-zinc-500">Owner</span>
                  <select disabled={!canUpdate} value={lead.assignedTo ?? ""} onChange={(event) => void apply({ assignedTo: event.target.value || null })} className="h-10 w-full rounded-lg border border-white/[.08] bg-[var(--panel)] px-2.5 text-sm text-zinc-200 disabled:opacity-60">
                    <option value="">Unassigned</option>
                    {callers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
              </div>
              {!lead.followUpAt && !locked && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[["Tomorrow", 1], ["In 3 days", 3], ["Next week", 7]].map(([label, days]) => (
                    <button key={label} onClick={() => void apply({ followUpAt: istShift(today, Number(days)) })} className="rounded-full border border-white/[.08] px-2.5 py-1 text-xs text-zinc-300 hover:border-white/[.2]">{label}</button>
                  ))}
                </div>
              )}
            </div>

            {canUpdate && !lead.doNotContact && (
              <div className="border-b border-white/[.07] p-5 sm:px-6">
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void save(); }}
                  rows={3}
                  maxLength={2000}
                  placeholder="What did they say? e.g. Working at TCS, wants weekend batch, call back after 20th"
                  className="w-full resize-none rounded-xl border border-white/[.09] bg-white/[.03] p-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-violet-400/40"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Ctrl/⌘ + Enter to save</span>
                  <Button size="sm" onClick={() => void save()} disabled={saving || !note.trim()}><Send size={13} /> {saving ? "Saving…" : "Add note"}</Button>
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:px-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-[.12em] text-zinc-500">History</p>
              {error && <p className="mb-3 rounded-xl border border-rose-400/15 bg-rose-400/[.05] p-3 text-sm text-rose-300">{error}</p>}
              {loading && !activity.length ? (
                <LoaderCircle className="mx-auto mt-6 animate-spin text-violet-400" />
              ) : !activity.length ? (
                <p className="text-sm text-zinc-500">No calls logged yet.</p>
              ) : (
                <ol className="space-y-3">
                  {activity.map((item) => (
                    <li key={item.id} className="rounded-xl border border-white/[.06] bg-white/[.02] p-3">
                      {item.kind === "status" && item.status ? (
                        <p className="flex items-center gap-2 text-sm text-zinc-200"><i className={cn("size-2 rounded-full", leadStatusMeta[item.status].dot)} /> Status set to <strong className="font-medium">{leadStatusMeta[item.status].label}</strong></p>
                      ) : item.kind === "comment" ? (
                        <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-100">{item.body}</p>
                      ) : (
                        <p className={cn("text-sm", item.kind === "callback_request" ? "text-violet-200" : item.kind === "opt_out" ? "text-rose-200" : "text-zinc-300")}>{item.body}</p>
                      )}
                      <p className="mt-1.5 text-xs text-zinc-500">{item.author ?? "Team"} · {formatIst(item.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Fact({ label, value, wide }: { label: string; value: string | null | undefined; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2")}>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 truncate text-zinc-100">{value || <span className="text-zinc-600">—</span>}</dd>
    </div>
  );
}

function initials(value: string) {
  return value.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((item) => item[0]?.toUpperCase()).join("") || "S";
}
