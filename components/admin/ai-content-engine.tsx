"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, CheckCircle2, CircleAlert, Clock3, FileText, LoaderCircle, Pencil, RefreshCw, Search, Sparkles, Trash2, XCircle } from "lucide-react";
import { Badge, Button, Card, ProgressBar } from "@/components/ui";
import {
  getContentPipeline,
  processContentJob,
  updateAdminQuestion,
  type AdminQuestion,
  type ContentJob,
} from "@/lib/repositories/admin-repository";

type Tab = "queue" | "review";

export function AIContentEngine() {
  const [tab, setTab] = useState<Tab>("queue");
  const [jobs, setJobs] = useState<ContentJob[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await getContentPipeline();
      setJobs(data.jobs);
      setQuestions(data.review);
      setSelectedId((current) => current || data.review[0]?.id || "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load the content pipeline."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const runJob = async (job: ContentJob) => {
    setWorking(job.id); setError(""); setMessage("");
    try {
      let result = await processContentJob(job.id);
      while (result.remaining > 0) result = await processContentJob(job.id);
      setMessage("AI enrichment finished. The questions are ready for admin review.");
      setTab("review");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Processing failed."); }
    finally { setWorking(""); }
  };

  const updateStatus = async (question: AdminQuestion, status: "approved" | "rejected") => {
    setWorking(question.id); setError("");
    try {
      const currentIndex = filtered.findIndex((item) => item.id === question.id);
      const orderedAfterCurrent = [
        ...filtered.slice(currentIndex + 1),
        ...filtered.slice(0, Math.max(0, currentIndex)),
      ];
      const nextPending = orderedAfterCurrent.find((item) =>
        item.id !== question.id && item.review_status === "pending",
      );
      await updateAdminQuestion(question.id, { bank: question.bank, review_status: status });
      setQuestions((current) => current.map((item) => item.id === question.id ? {
        ...item, review_status: status, is_published: status === "approved",
      } : item));
      setSelectedId(nextPending?.id ?? question.id);
      setMessage(nextPending
        ? status === "approved"
          ? "Question approved and published. The next pending question is ready."
          : "Question rejected. The next pending question is ready."
        : status === "approved"
          ? "Question approved and published. No pending questions remain."
          : "Question rejected. No pending questions remain.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Review update failed."); }
    finally { setWorking(""); }
  };

  const saveReviewEdits = async (question: AdminQuestion, changes: Partial<AdminQuestion>) => {
    setWorking(question.id); setError("");
    try {
      await updateAdminQuestion(question.id, { ...changes, bank: question.bank });
      setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, ...changes } : item));
      setMessage("Review edits saved permanently.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Review edits could not be saved."); }
    finally { setWorking(""); }
  };

  const term = search.toLowerCase().trim();
  const filtered = questions.filter((question) => !term || question.question_text.toLowerCase().includes(term) || question.tags.some((tag) => tag.toLowerCase().includes(term)));
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];
  const pending = questions.filter((item) => item.review_status === "pending").length;

  return <section className="mt-4">
    <Card className="overflow-hidden">
      <div className="relative border-b border-white/[.07] bg-gradient-to-r from-violet-500/[.1] via-transparent to-cyan-500/[.06] p-5 sm:p-6">
        <div className="premium-grid absolute inset-0 opacity-25" />
        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl border border-violet-400/15 bg-violet-400/10 text-violet-300"><BrainCircuit size={23} /></span><div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold">AI Content Engine</h2><Badge tone="green">Server worker</Badge></div><p className="mt-1 text-[10px] text-zinc-500">Enrich once, review carefully, then publish permanently.</p></div></div>
          <div className="flex gap-2"><Metric value={jobs.filter((job) => ["queued","running"].includes(job.status)).length} label="Jobs active" /><Metric value={pending} label="Awaiting review" /></div>
        </div>
      </div>
      <div className="flex items-center gap-2 border-b border-white/[.06] p-3 sm:px-5">
        <button onClick={() => setTab("queue")} className={`rounded-xl px-4 py-2 text-[10px] ${tab === "queue" ? "bg-violet-400/10 text-violet-200" : "text-zinc-600"}`}><Clock3 size={13} className="mr-2 inline" />Processing queue</button>
        <button onClick={() => setTab("review")} className={`rounded-xl px-4 py-2 text-[10px] ${tab === "review" ? "bg-violet-400/10 text-violet-200" : "text-zinc-600"}`}><CheckCircle2 size={13} className="mr-2 inline" />Approval desk <span className="ml-1 rounded-full bg-amber-400/10 px-1.5 text-amber-300">{pending}</span></button>
        <button onClick={() => void refresh()} className="ml-auto grid size-9 place-items-center rounded-xl text-zinc-600 hover:bg-white/[.05]" aria-label="Refresh"><RefreshCw size={14} /></button>
      </div>
      {message && <p className="m-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[.05] p-3 text-xs text-emerald-300">{message}</p>}
      {error && <p className="m-4 rounded-xl border border-rose-400/15 bg-rose-400/[.05] p-3 text-xs text-rose-300">{error}</p>}
      {loading ? <div className="grid min-h-72 place-items-center"><LoaderCircle className="animate-spin text-violet-400" /></div> :
      <AnimatePresence mode="wait">
        {tab === "queue" ? <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 sm:p-6">
          {jobs.length ? <div className="grid gap-3">{jobs.map((job) => {
            const actionable = ["queued","running","failed"].includes(job.status);
            return <div key={job.id} className="rounded-2xl border border-white/[.07] bg-white/[.018] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${job.status === "review" || job.status === "completed" ? "bg-emerald-400/10 text-emerald-300" : job.status === "failed" ? "bg-rose-400/10 text-rose-300" : "bg-violet-400/10 text-violet-300"}`}>{working === job.id ? <LoaderCircle size={19} className="animate-spin" /> : job.status === "review" || job.status === "completed" ? <CheckCircle2 size={19} /> : job.status === "failed" ? <XCircle size={19} /> : <Sparkles size={19} />}</span>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-xs font-medium">{job.content_uploads?.file_name ?? "Question import"}</p><Badge>{job.status}</Badge></div><p className="mt-1 text-[9px] text-zinc-600">{job.stage.replaceAll("_", " ")} · {job.generated_count}/{job.source_question_count} enriched</p></div>
                {actionable && <Button onClick={() => void runJob(job)} disabled={Boolean(working)}>{working === job.id ? "Processing…" : job.status === "failed" ? "Retry failed" : "Run enrichment"}</Button>}
              </div>
              <div className="mt-4 flex items-center gap-3"><ProgressBar value={job.progress} className="flex-1" /><span className="font-mono text-[9px] text-zinc-500">{job.progress}%</span></div>
              {job.error_message && <p className="mt-3 flex items-start gap-2 text-[9px] text-rose-300"><CircleAlert size={12} className="mt-0.5 shrink-0" />{job.error_message}</p>}
            </div>;
          })}</div> : <Empty icon={FileText} title="No imports yet" body="Use Questions → Bulk import to insert original questions and create an enrichment job." />}
        </motion.div> :
        <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid min-h-[580px] lg:grid-cols-[340px_1fr]">
          <aside className="border-b border-white/[.06] p-4 lg:border-b-0 lg:border-r"><div className="flex h-10 items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] px-3"><Search size={13} className="text-zinc-600" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search review queue…" className="min-w-0 flex-1 bg-transparent text-[10px] outline-none" /></div><div className="mt-3 max-h-[500px] space-y-2 overflow-y-auto">{filtered.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-xl border p-3 text-left ${selected?.id === item.id ? "border-violet-400/20 bg-violet-400/[.07]" : "border-white/[.055] bg-white/[.015]"}`}><div className="flex items-center gap-2"><Badge>{item.question_type || "Conceptual"}</Badge><span className={`ml-auto size-1.5 rounded-full ${item.review_status === "approved" ? "bg-emerald-400" : item.review_status === "rejected" ? "bg-rose-400" : "bg-amber-400"}`} /></div><p className="mt-2 line-clamp-2 text-[10px] leading-5 text-zinc-400">{item.question_text}</p><p className="mt-2 text-[8px] text-zinc-700">{item.enrichment_status} · {item.categories?.name}</p></button>)}</div></aside>
          {selected ? <ReviewDetail question={selected} working={working === selected.id} onStatus={updateStatus} onSave={saveReviewEdits} /> : <Empty icon={CheckCircle2} title="Review queue is clear" body="Enriched imported questions will appear here." />}
        </motion.div>}
      </AnimatePresence>}
    </Card>
  </section>;
}

function ReviewDetail({ question, working, onStatus, onSave }: { question: AdminQuestion; working: boolean; onStatus: (question: AdminQuestion, status: "approved" | "rejected") => Promise<void>; onSave: (question: AdminQuestion, changes: Partial<AdminQuestion>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const split = (name: string) => String(form.get(name) ?? "").split(/[|,\n]/).map((item) => item.trim()).filter(Boolean);
    await onSave(question, {
      answer_text: String(form.get("answer_text") ?? "").trim(),
      explanation: String(form.get("explanation") ?? "").trim(),
      expected_keywords: split("expected_keywords"),
      hints: split("hints"),
      common_mistakes: split("common_mistakes"),
      follow_up_questions: split("follow_up_questions"),
    });
    setEditing(false);
  };
  return <div className="p-4 sm:p-6">
    <div className="flex flex-wrap items-center gap-2"><Badge tone="violet">Imported original</Badge><Badge>{question.difficulty}</Badge><Badge tone={question.review_status === "approved" ? "green" : question.review_status === "rejected" ? "rose" : "amber"}>{question.review_status}</Badge><span className="ml-auto text-[9px] text-zinc-600">{question.enrichment_status}</span></div>
    <div className="mt-5 rounded-2xl border border-white/[.07] bg-white/[.02] p-5"><p className="text-[9px] uppercase tracking-[.15em] text-violet-400">Question</p><p className="mt-3 text-base font-medium leading-7">{question.question_text}</p><p className="mt-5 text-[9px] uppercase tracking-[.15em] text-cyan-400">Original expected answer</p><p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-zinc-400">{question.answer_text}</p></div>
    {editing ? <form onSubmit={save} className="mt-4 space-y-3 rounded-2xl border border-violet-400/15 bg-violet-400/[.025] p-5">
      <ReviewField label="Expected answer"><textarea name="answer_text" defaultValue={question.answer_text} rows={6} className="admin-input resize-y" /></ReviewField>
      <ReviewField label="AI explanation"><textarea name="explanation" defaultValue={question.explanation || ""} rows={6} className="admin-input resize-y" /></ReviewField>
      <div className="grid gap-3 sm:grid-cols-2"><ReviewField label="Expected keywords"><textarea name="expected_keywords" defaultValue={question.expected_keywords?.join(", ")} rows={3} className="admin-input resize-y" /></ReviewField><ReviewField label="Hints"><textarea name="hints" defaultValue={question.hints?.join("\n")} rows={3} className="admin-input resize-y" /></ReviewField></div>
      <div className="grid gap-3 sm:grid-cols-2"><ReviewField label="Common mistakes"><textarea name="common_mistakes" defaultValue={question.common_mistakes?.join("\n")} rows={3} className="admin-input resize-y" /></ReviewField><ReviewField label="Follow-up questions"><textarea name="follow_up_questions" defaultValue={question.follow_up_questions?.join("\n")} rows={3} className="admin-input resize-y" /></ReviewField></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button><Button type="submit" disabled={working}>{working ? "Saving…" : "Save review edits"}</Button></div>
    </form> : <div className="mt-4 rounded-2xl border border-white/[.07] bg-[#0d0d0f] p-5"><p className="text-[9px] uppercase tracking-[.15em] text-cyan-400">Stored AI enrichment</p><p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-zinc-400">{question.explanation || "No enrichment stored yet."}</p><div className="mt-4 flex flex-wrap gap-2">{question.tags.map((tag) => <span key={tag} className="rounded-lg bg-cyan-400/[.055] px-2 py-1 text-[8px] text-cyan-300">#{tag}</span>)}</div></div>}
    <div className="mt-4 grid gap-3 sm:grid-cols-3"><Info label="Topic" value={[question.topic, question.subtopic].filter(Boolean).join(" / ") || "—"} /><Info label="Expected keywords" value={question.expected_keywords?.join(", ") || "—"} /><Info label="Hints" value={question.hints?.join(" · ") || "—"} /></div>
    <div className="mt-6 flex flex-col gap-2 border-t border-white/[.06] pt-5 sm:flex-row"><Button variant="secondary" onClick={() => setEditing(true)}><Pencil size={14} /> Edit draft</Button><Button variant="secondary" onClick={() => void onStatus(question, "rejected")} disabled={working} className="sm:ml-auto"><Trash2 size={14} /> Reject</Button><Button onClick={() => void onStatus(question, "approved")} disabled={working}><CheckCircle2 size={14} /> Approve & publish</Button></div>
  </div>;
}

function Metric({ value, label }: { value: number; label: string }) { return <div className="rounded-xl border border-white/[.07] bg-black/20 px-3 py-2"><p className="text-sm font-semibold">{value}</p><p className="text-[8px] text-zinc-600">{label}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/[.06] bg-white/[.018] p-3"><p className="text-[8px] text-zinc-700">{label}</p><p className="mt-2 text-[10px] leading-5 text-zinc-400">{value}</p></div>; }
function ReviewField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-[9px] text-zinc-500">{label}</span>{children}</label>; }
function Empty({ icon: Icon, title, body }: { icon: typeof FileText; title: string; body: string }) { return <div className="grid min-h-64 place-items-center p-6 text-center"><div><Icon size={28} className="mx-auto text-zinc-600" /><p className="mt-3 text-xs font-medium">{title}</p><p className="mt-1 max-w-sm text-[10px] leading-5 text-zinc-600">{body}</p></div></div>; }
