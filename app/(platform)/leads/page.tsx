"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BadgeCheck, CalendarDays, ChevronLeft, ChevronRight, Download, LoaderCircle, Mail, MessageCircle,
  MessageSquareText, Phone, RefreshCw, Search, Send, UsersRound, X,
} from "lucide-react";
import { RoleGate } from "@/components/access-gate";
import { Badge, Button, Card } from "@/components/ui";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import {
  formatIst, istShift, istToday, leadStatuses, leadStatusMeta,
  type Lead, type LeadActivity, type LeadStatus,
} from "@/lib/leads";
import { can } from "@/lib/rbac";
import {
  addLeadNote, downloadLeadsCsv, listLeadActivity, listLeads, updateLeadStatus,
  type LeadCounts, type LeadFilters,
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

export default function LeadsPage() {
  return <RoleGate permission="leads.view"><LeadsDashboard /></RoleGate>;
}

function LeadsDashboard() {
  const { profile } = useCurrentUser();
  const today = istToday();
  const [preset, setPreset] = useState<Preset>("today");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState<"all" | LeadStatus>("all");
  const [verified, setVerified] = useState("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<LeadCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const canUpdate = can(profile?.role, "leads.update");
  const canExport = can(profile?.role, "leads.export");
  const filters: LeadFilters = useMemo(() => ({ from, to, status, verified, q }), [from, to, status, verified, q]);

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
  const rangeLabel = singleDay
    ? formatIst(`${from}T12:00:00+05:30`, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : `${formatIst(`${from}T12:00:00+05:30`, { day: "numeric", month: "short" })} – ${formatIst(`${to}T12:00:00+05:30`, { day: "numeric", month: "short", year: "numeric" })}`;

  const changeStatus = async (id: string, next: LeadStatus) => {
    const previous = leads.find((lead) => lead.id === id);
    if (!previous || previous.status === next) return;
    setLeads((items) => items.map((lead) => lead.id === id ? { ...lead, status: next, statusUpdatedBy: profile?.name ?? "You", statusUpdatedAt: new Date().toISOString() } : lead));
    setCounts((value) => value && { ...value, [previous.status]: value[previous.status] - 1, [next]: value[next] + 1 });
    try {
      await updateLeadStatus(id, next);
    } catch (cause) {
      setLeads((items) => items.map((lead) => lead.id === id ? previous : lead));
      setCounts((value) => value && { ...value, [previous.status]: value[previous.status] + 1, [next]: value[next] - 1 });
      setError(cause instanceof Error ? cause.message : "Could not update status.");
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
    { key: "all", label: "Registered", value: total, dot: "bg-violet-400" },
    ...leadStatuses.map((key) => ({ key, label: leadStatusMeta[key].label, value: counts?.[key] ?? 0, dot: leadStatusMeta[key].dot })),
  ];

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge tone="violet"><UsersRound size={11} className="mr-1" /> Leads</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Registered students</h1>
          <p className="mt-2 flex items-center gap-2 text-xs text-zinc-500"><CalendarDays size={13} /> {rangeLabel} · times in IST</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void load()} disabled={loading} aria-label="Refresh"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</Button>
          {canExport && <Button variant="secondary" onClick={() => void exportCsv()} disabled={exporting || !leads.length}><Download size={14} /> {exporting ? "Exporting…" : "Export CSV"}</Button>}
        </div>
      </div>

      {/* Date controls */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex overflow-x-auto rounded-xl border border-white/[.07] bg-white/[.025] p-1">
          {presets.map((item) => (
            <button key={item.id} onClick={() => choosePreset(item.id)} className={cn("shrink-0 rounded-lg px-3 py-2 text-[11px] transition", preset === item.id ? "bg-white/[.08] text-white" : "text-zinc-500 hover:text-zinc-200")}>{item.label}</button>
          ))}
        </div>
        {preset === "custom" ? (
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <input type="date" value={from} max={to} onChange={(event) => event.target.value && setFrom(event.target.value)} className="h-10 rounded-xl border border-white/[.08] bg-[var(--panel)] px-3 text-xs text-zinc-200" />
            <span>to</span>
            <input type="date" value={to} min={from} max={today} onChange={(event) => event.target.value && setTo(event.target.value)} className="h-10 rounded-xl border border-white/[.08] bg-[var(--panel)] px-3 text-xs text-zinc-200" />
          </div>
        ) : singleDay && (
          <div className="flex items-center gap-1">
            <button onClick={() => stepDay(-1)} className="grid size-10 place-items-center rounded-xl border border-white/[.08] text-zinc-400 hover:text-white" aria-label="Previous day"><ChevronLeft size={15} /></button>
            <input type="date" value={from} max={today} onChange={(event) => { if (!event.target.value) return; setFrom(event.target.value); setTo(event.target.value); setPreset(event.target.value === today ? "today" : "day"); }} className="h-10 rounded-xl border border-white/[.08] bg-[var(--panel)] px-3 text-xs text-zinc-200" aria-label="Pick a day" />
            <button onClick={() => stepDay(1)} disabled={from >= today} className="grid size-10 place-items-center rounded-xl border border-white/[.08] text-zinc-400 hover:text-white disabled:opacity-30" aria-label="Next day"><ChevronRight size={15} /></button>
          </div>
        )}
      </div>

      {/* KPI filter cards */}
      <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((item) => {
          const active = status === item.key;
          const percent = total && item.key !== "all" ? Math.round(item.value / total * 100) : null;
          return (
            <button key={item.key} onClick={() => setStatus(item.key)} className={cn("rounded-2xl border bg-[var(--panel)] p-4 text-left transition", active ? "border-violet-400/40 shadow-[0_0_0_1px_rgba(167,139,250,.25)]" : "border-white/[.07] hover:border-white/[.14]")}>
              <span className="flex items-center gap-2 text-[10px] text-zinc-500"><i className={cn("size-2 rounded-full", item.dot)} />{item.label}</span>
              <span className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">{loading && !counts ? "–" : item.value}</span>
                {percent !== null && <span className="text-[10px] text-zinc-600">{percent}%</span>}
              </span>
              {item.key === "all" && counts && <span className="mt-1 block text-[9px] text-emerald-300/80">{counts.verified} WhatsApp verified</span>}
            </button>
          );
        })}
      </section>

      {/* Toolbar */}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-white/[.08] bg-[var(--panel)] px-3">
          <Search size={14} className="text-zinc-600" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or phone" className="min-w-0 flex-1 bg-transparent text-xs placeholder:text-zinc-600" />
        </label>
        <select value={verified} onChange={(event) => setVerified(event.target.value)} className="h-10 rounded-xl border border-white/[.08] bg-[var(--panel)] px-3 text-xs">
          <option value="all">All numbers</option>
          <option value="yes">WhatsApp verified</option>
          <option value="no">Not verified</option>
        </select>
      </div>

      {error && <p className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/[.05] p-3 text-xs text-rose-300">{error}</p>}

      {/* Lead list */}
      <Card className="mt-4 overflow-hidden">
        <div className="hidden grid-cols-[1.4fr_1.1fr_.8fr_1fr_1.3fr] gap-4 border-b border-white/[.06] px-5 py-3 text-[10px] uppercase tracking-[.12em] text-zinc-600 lg:grid">
          <span>Student</span><span>Contact</span><span>Registered</span><span>Status</span><span>Notes</span>
        </div>
        {loading && !leads.length ? (
          <div className="grid min-h-64 place-items-center"><LoaderCircle className="animate-spin text-violet-400" /></div>
        ) : !leads.length ? (
          <div className="grid min-h-64 place-items-center p-6 text-center">
            <div>
              <UsersRound size={28} className="mx-auto text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-300">No students here yet</p>
              <p className="mt-1 text-xs text-zinc-600">{status !== "all" || q || verified !== "all" ? "Try clearing the filters." : "New registrations for this date will appear here."}</p>
            </div>
          </div>
        ) : leads.map((lead) => (
          <LeadRow key={lead.id} lead={lead} canUpdate={canUpdate} onStatus={(next) => void changeStatus(lead.id, next)} onOpen={() => setOpenId(lead.id)} />
        ))}
      </Card>
      {leads.length > 0 && <p className="mt-3 text-[10px] text-zinc-600">Showing {leads.length} of {total} students</p>}

      <LeadDrawer
        lead={openLead}
        canUpdate={canUpdate}
        onClose={() => setOpenId(null)}
        onStatus={(next) => openLead ? changeStatus(openLead.id, next) : Promise.resolve()}
        onNoteAdded={(body) => openLead && setLeads((items) => items.map((lead) => lead.id === openLead.id ? { ...lead, lastNote: body, lastNoteAt: new Date().toISOString(), noteCount: lead.noteCount + 1 } : lead))}
      />
    </div>
  );
}

function LeadRow({ lead, canUpdate, onStatus, onOpen }: { lead: Lead; canUpdate: boolean; onStatus: (status: LeadStatus) => void; onOpen: () => void }) {
  return (
    <div className="grid gap-3 border-b border-white/[.05] px-5 py-4 last:border-0 hover:bg-white/[.015] lg:grid-cols-[1.4fr_1.1fr_.8fr_1fr_1.3fr] lg:items-center lg:gap-4">
      <button onClick={onOpen} className="flex min-w-0 items-center gap-3 text-left">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-[11px] font-semibold text-violet-300">{initials(lead.name || lead.email)}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-zinc-100">{lead.name || "Unnamed student"}</span>
          <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-zinc-500"><Mail size={11} className="shrink-0" /> {lead.email}</span>
        </span>
      </button>
      <ContactActions lead={lead} />
      <div className="text-[11px] text-zinc-400">
        {formatIst(lead.registeredAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
        {lead.quizAttempts > 0 && <span className="mt-0.5 block text-[10px] text-cyan-300/80">{lead.quizAttempts} quiz{lead.quizAttempts === 1 ? "" : "zes"} taken</span>}
      </div>
      <div>
        <StatusSelect value={lead.status} disabled={!canUpdate} onChange={onStatus} />
        {lead.statusUpdatedBy && <p className="mt-1 truncate text-[9px] text-zinc-600">by {lead.statusUpdatedBy}{lead.statusUpdatedAt ? ` · ${formatIst(lead.statusUpdatedAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : ""}</p>}
      </div>
      <button onClick={onOpen} className="flex min-w-0 items-start gap-2 rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-2 text-left hover:border-white/[.12]">
        <MessageSquareText size={14} className="mt-0.5 shrink-0 text-zinc-500" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] text-zinc-300">{lead.lastNote ?? (canUpdate ? "Add a note…" : "No notes yet")}</span>
          {lead.noteCount > 0 && <span className="text-[9px] text-zinc-600">{lead.noteCount} note{lead.noteCount === 1 ? "" : "s"}</span>}
        </span>
      </button>
    </div>
  );
}

function ContactActions({ lead }: { lead: Lead }) {
  if (!lead.mobile) return <span className="text-[11px] text-zinc-600">No phone</span>;
  const digits = lead.mobile.replace(/\D/g, "");
  return (
    <div className="flex items-center gap-2">
      <a href={`tel:${lead.mobile}`} className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-zinc-200 hover:text-white">
        <Phone size={12} className="shrink-0 text-emerald-300" /> <span className="truncate">{lead.mobile}</span>
      </a>
      {lead.phoneVerified
        ? <BadgeCheck size={14} className="shrink-0 text-emerald-400" aria-label="WhatsApp verified" />
        : <span className="shrink-0 rounded-full border border-amber-400/20 px-1.5 text-[9px] text-amber-300">unverified</span>}
      <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20" aria-label="Open WhatsApp chat"><MessageCircle size={13} /></a>
    </div>
  );
}

function StatusSelect({ value, disabled, onChange }: { value: LeadStatus; disabled?: boolean; onChange: (status: LeadStatus) => void }) {
  const tones: Record<LeadStatus, string> = {
    new: "border-white/10 text-zinc-300",
    interested: "border-emerald-400/30 bg-emerald-400/[.07] text-emerald-200",
    maybe_later: "border-amber-400/30 bg-amber-400/[.07] text-amber-200",
    not_interested: "border-rose-400/30 bg-rose-400/[.07] text-rose-200",
  };
  return (
    <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as LeadStatus)} className={cn("h-9 w-full max-w-[180px] rounded-lg border bg-[var(--panel)] px-2.5 text-xs disabled:opacity-70", tones[value])} aria-label="Call status">
      {leadStatuses.map((key) => <option key={key} value={key}>{leadStatusMeta[key].label}</option>)}
    </select>
  );
}

function LeadDrawer({ lead, canUpdate, onClose, onStatus, onNoteAdded }: {
  lead: Lead | null; canUpdate: boolean; onClose: () => void; onStatus: (status: LeadStatus) => Promise<void>; onNoteAdded: (body: string) => void;
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
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load notes."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [leadId, reloadKey]);

  const pickStatus = async (status: LeadStatus) => {
    if (!lead || lead.status === status) return;
    await onStatus(status);
    setReloadKey((value) => value + 1);
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

  return (
    <Dialog.Root open={Boolean(lead)} onOpenChange={(open) => { if (!open) { onClose(); setNote(""); setActivity([]); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[90] flex w-full max-w-lg flex-col border-l border-white/10 bg-[var(--panel)] shadow-[0_0_120px_rgba(0,0,0,.5)]">
          {lead && <>
            <div className="border-b border-white/[.07] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Dialog.Title className="truncate text-xl font-semibold tracking-[-.03em]">{lead.name || "Unnamed student"}</Dialog.Title>
                  <Dialog.Description className="mt-1 truncate text-xs text-zinc-500">{lead.email} · registered {formatIst(lead.registeredAt)}</Dialog.Description>
                </div>
                <Dialog.Close className="grid size-9 shrink-0 place-items-center rounded-xl text-zinc-500 hover:bg-white/[.06]" aria-label="Close"><X size={18} /></Dialog.Close>
              </div>
              <div className="mt-4"><ContactActions lead={lead} /></div>
              <p className="mb-2 mt-5 text-[10px] uppercase tracking-[.14em] text-zinc-600">Call status</p>
              <div className="grid grid-cols-2 gap-2">
                {leadStatuses.map((key) => (
                  <button key={key} disabled={!canUpdate} onClick={() => void pickStatus(key)} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs transition disabled:cursor-not-allowed", lead.status === key ? "border-violet-400/50 bg-violet-400/[.09] text-white" : "border-white/[.08] text-zinc-400 hover:border-white/[.16]")}>
                    <i className={cn("size-2 rounded-full", leadStatusMeta[key].dot)} /> {leadStatusMeta[key].label}
                  </button>
                ))}
              </div>
            </div>

            {canUpdate && (
              <div className="border-b border-white/[.07] p-5 sm:px-6">
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void save(); }}
                  rows={3}
                  maxLength={2000}
                  placeholder="What did they say? e.g. Working at TCS, wants weekend batch, call back after 20th"
                  className="w-full resize-none rounded-xl border border-white/[.09] bg-white/[.03] p-3 text-xs leading-5 text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-violet-400/40"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[9px] text-zinc-600">Ctrl/⌘ + Enter to save</span>
                  <Button size="sm" onClick={() => void save()} disabled={saving || !note.trim()}><Send size={12} /> {saving ? "Saving…" : "Add note"}</Button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 sm:px-6">
              <p className="mb-3 text-[10px] uppercase tracking-[.14em] text-zinc-600">History</p>
              {error && <p className="mb-3 rounded-xl border border-rose-400/15 bg-rose-400/[.05] p-3 text-xs text-rose-300">{error}</p>}
              {loading && !activity.length ? (
                <LoaderCircle className="mx-auto mt-6 animate-spin text-violet-400" />
              ) : !activity.length ? (
                <p className="text-xs text-zinc-600">No calls logged yet.</p>
              ) : (
                <ol className="space-y-3">
                  {activity.map((item) => (
                    <li key={item.id} className="rounded-xl border border-white/[.06] bg-white/[.02] p-3">
                      {item.kind === "status" && item.status ? (
                        <p className="flex items-center gap-2 text-xs text-zinc-300"><i className={cn("size-2 rounded-full", leadStatusMeta[item.status].dot)} /> Status set to <strong className="font-medium">{leadStatusMeta[item.status].label}</strong></p>
                      ) : (
                        <p className="whitespace-pre-wrap text-xs leading-5 text-zinc-200">{item.body}</p>
                      )}
                      <p className="mt-1.5 text-[9px] text-zinc-600">{item.author ?? "Team"} · {formatIst(item.createdAt)}</p>
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

function initials(value: string) {
  return value.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((item) => item[0]?.toUpperCase()).join("") || "S";
}
