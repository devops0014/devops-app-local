"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Download, Laptop, LoaderCircle, UsersRound } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { getAdminOverview, type AdminLog, type AdminStudent } from "@/lib/repositories/admin-repository";

export function PlatformManager({ mode, query = "" }: { mode: "students" | "audit"; query?: string }) {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [scoreBand, setScoreBand] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    void getAdminOverview().then((data) => {
      setStudents(data.students); setLogs(data.logs);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load platform records.")).finally(() => setLoading(false));
  }, []);
  const term = query.toLowerCase().trim();
  const visibleStudents = useMemo(() => students.filter((item) => {
    const score = item.performance_score;
    const bandMatch = scoreBand === "all" || (scoreBand.startsWith("lt") ? score < Number(scoreBand.slice(2)) : score > Number(scoreBand.slice(2)));
    const statusMatch = status === "all" || (status === "online" ? item.is_online : !item.is_online);
    return (!term || `${item.name} ${item.email} ${item.mobile}`.toLowerCase().includes(term))
      && statusMatch && bandMatch;
  }), [students, term, status, scoreBand]);
  const visibleLogs = useMemo(() => logs.filter((item) => !term || `${item.action} ${item.entity_type} ${item.profiles?.email}`.toLowerCase().includes(term)), [logs, term]);
  if (loading) return <Card className="mt-4 grid min-h-64 place-items-center"><LoaderCircle className="animate-spin text-violet-400" /></Card>;
  if (error) return <p className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/[.05] p-4 text-xs text-rose-300">{error}</p>;
  if (mode === "audit") return <Card className="mt-4 overflow-hidden">
    {visibleLogs.length ? visibleLogs.map((log) => <div key={log.id} className="flex items-start gap-3 border-b border-white/[.05] p-4 last:border-0"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Activity size={15} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-medium">{humanize(log.action)}</p><Badge>{log.entity_type}</Badge></div><p className="mt-1 text-xs text-zinc-600">{log.profiles?.name || log.profiles?.email || "System administrator"} · {new Date(log.created_at).toLocaleString()}</p></div></div>) : <Empty label="No admin activity has been recorded yet." />}
  </Card>;
  return <>
    <div className="mt-4 flex flex-wrap gap-2">
      <Filter value={status} setValue={setStatus} options={[["all","All students"],["online","Online now"],["offline","Offline"]]} />
      <Filter value={scoreBand} setValue={setScoreBand} options={[["all","All scores"],["lt20","Below 20"],["lt30","Below 30"],["lt50","Below 50"],["gt70","Above 70"],["gt80","Above 80"],["gt90","Above 90"]]} />
      <Button variant="secondary" onClick={() => downloadStudents(visibleStudents)}><Download size={14} /> Download report ({visibleStudents.length})</Button>
    </div>
    <Card className="mt-3 overflow-hidden">
      {visibleStudents.length ? visibleStudents.map((student) => {
        const open = expanded === student.id;
        return <button key={student.id} onClick={() => setExpanded(open ? null : student.id)} className="block w-full border-b border-white/[.05] p-4 text-left last:border-0 hover:bg-white/[.02]">
          <div className="grid gap-3 sm:grid-cols-[1fr_130px_80px_90px_90px] sm:items-center">
            <div className="flex min-w-0 items-center gap-3"><span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-xs font-semibold text-violet-300">{initials(student.name || student.email)}<i className={`absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-[var(--panel)] ${student.is_online ? "bg-emerald-400" : "bg-zinc-700"}`} /></span><div className="min-w-0"><p className="truncate text-xs">{student.name || "Profile incomplete"}</p><p className={`mt-1 text-xs ${student.is_online ? "text-emerald-400" : "text-zinc-600"}`}>{student.is_online ? "Online · practicing now" : "Offline"}</p><p className="mt-0.5 truncate text-xs text-zinc-600">{student.email}</p></div></div>
            <Badge tone="violet">Joined {new Date(student.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</Badge>
            <Badge tone={student.is_online ? "green" : "amber"}>{student.is_online ? "online" : "offline"}</Badge>
            <span className="text-xs"><strong>{student.performance_score}</strong>/100</span>
            <span className="flex items-center gap-1 text-xs text-zinc-500"><Laptop size={11} /> {student.active_devices} devices</span>
          </div>
          {open && <div className="mt-4 grid gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-4 text-xs sm:grid-cols-3 lg:grid-cols-6">
            <Metric label="Mobile" value={student.mobile || "Not provided"} />
            <Metric label="Quiz attempts" value={String(student.quiz_attempts)} />
            <Metric label="Quiz average" value={`${student.quiz_average}%`} />
            <Metric label="Active devices" value={String(student.active_devices)} />
            <Metric label="Last active" value={student.last_active ? new Date(student.last_active).toLocaleDateString() : "Never"} />
            <Metric label="Strong mastery" value={`${student.mastery_percent}%`} />
          </div>}
        </button>;
      }) : <Empty label="No students match these filters." />}
    </Card>
  </>;
}

function Filter({ value, setValue, options }: { value: string; setValue: (value: string) => void; options: string[][] }) {
  return <select value={value} onChange={(event) => setValue(event.target.value)} className="h-10 rounded-xl border border-white/[.08] bg-[var(--panel)] px-3 text-xs">{options.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-zinc-600">{label}</p><p className="mt-1 text-zinc-300">{value}</p></div>; }
function downloadStudents(students: AdminStudent[]) {
  const rows = [["Name","Email","Mobile","Joined","Performance","Quiz attempts","Quiz average","Mastery","Active devices"],
    ...students.map((s) => [s.name || "",s.email,s.mobile || "",s.created_at.slice(0, 10),s.performance_score,s.quiz_attempts,s.quiz_average,s.mastery_percent,s.active_devices])];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"','""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "devopscrack-student-performance-report.csv"; anchor.click(); URL.revokeObjectURL(url);
}
function initials(value: string) { return value.split(/[\s@]+/).slice(0, 2).map((item) => item[0]?.toUpperCase()).join(""); }
function humanize(value: string) { return value.replaceAll(".", " › ").replaceAll("_", " "); }
function Empty({ label }: { label: string }) { return <div className="grid min-h-56 place-items-center p-6 text-center"><div><UsersRound size={28} className="mx-auto text-zinc-600" /><p className="mt-3 text-xs text-zinc-500">{label}</p></div></div>; }
