"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, CheckCircle2, Download, FileJson, FileSpreadsheet, LoaderCircle, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import {
  createAdminQuestion,
  createDefaultAdminCategories,
  deleteAdminQuestion,
  importQuestionBank,
  listAdminCategories,
  listAdminQuestions,
  publishAllDraftQuestions,
  updateAdminQuestion,
  type AdminCategory,
  type AdminQuestion,
  type QuestionInput,
} from "@/lib/repositories/admin-repository";

const emptyInput: QuestionInput = {
  category_id: "",
  question_text: "",
  answer_text: "",
  difficulty: "Medium",
  tags: [],
  company_asked: [],
  is_published: true,
};

export function QuestionManager() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [query, setQuery] = useState("");
  const [bankFilter, setBankFilter] = useState<"all" | "mcq" | "general">("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editor, setEditor] = useState<{ open: boolean; question: AdminQuestion | null }>({ open: false, question: null });
  const [importOpen, setImportOpen] = useState(false);
  const [importBank, setImportBank] = useState<"mcq" | "general" | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [publishingDrafts, setPublishingDrafts] = useState(false);
  const [creatingCategories, setCreatingCategories] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{
    file: File; text: string; rows: Record<string, unknown>[];
    localInvalid: Array<{ rowNumber: number; reason: string }>;
  } | null>(null);
  const [report, setReport] = useState<{
    total: number; accepted: number;
    invalid: Array<{ rowNumber: number; errors: string[] }>;
    duplicates: Array<{ rowNumber: number; question: string }>;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [questionRows, categoryRows] = await Promise.all([listAdminQuestions(), listAdminCategories()]);
      setQuestions(questionRows);
      setCategories(categoryRows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load questions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return questions.filter((item) =>
      (bankFilter === "all" || item.bank === bankFilter) &&
      (!term || item.question_text.toLowerCase().includes(term) ||
        item.categories?.name.toLowerCase().includes(term) ||
        item.tags.some((tag) => tag.toLowerCase().includes(term))),
    );
  }, [bankFilter, questions, query]);
  const pageSize = 100;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleQuestions = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [bankFilter, query]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const remove = async (question: AdminQuestion) => {
    if (!window.confirm("Delete this question permanently?")) return;
    try {
      await deleteAdminQuestion(question.id, question.bank);
      setQuestions((current) => current.filter((item) => item.id !== question.id));
      setMessage("Question deleted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Delete failed.");
    }
  };

  const createCategories = async () => {
    setCreatingCategories(true);
    setError("");
    try {
      const rows = await createDefaultAdminCategories();
      setCategories(rows);
      setMessage(`${rows.length} question categories are ready.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create categories.");
    } finally {
      setCreatingCategories(false);
    }
  };

  const previewFile = async (file?: File) => {
    if (!file) return;
    setError("");
    setMessage("");
    try {
      if (file.size > 10_000_000) throw new Error("File must be smaller than 10 MB.");
      const text = await file.text();
      const rawRows = file.name.toLowerCase().endsWith(".json") ? parseJson(text) : parseCsv(text);
      if (!rawRows.length) throw new Error("No question rows were found.");
      if (!importBank) throw new Error("Choose MCQ or General questions first.");
      const localInvalid = rawRows.flatMap((row, index) => {
        const missing = [];
        if (!String(row.category ?? row.category_slug ?? "").trim()) missing.push("category");
        if (!String(row.question_text ?? row.question ?? "").trim()) missing.push("question_text");
        if (!String(row.answer_text ?? row.expected_answer ?? row.answer ?? "").trim()) missing.push("answer_text");
        if (importBank === "mcq" && !String(row.option_1 ?? row["option-1"] ?? "").trim()) missing.push("option_1");
        if (importBank === "mcq" && !String(row.correct_option ?? row["correct option"] ?? "").trim()) missing.push("correct_option");
        if (importBank === "general" && !String(row.question_type ?? row.type ?? "").trim()) missing.push("question_type");
        return missing.length ? [{ rowNumber: index + 2, reason: `Missing ${missing.join(", ")}` }] : [];
      });
      setPreview({ file, text, rows: rawRows, localInvalid });
      setReport(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const commitImport = async () => {
    if (!preview) return;
    if (!importBank) return;
    setImporting(true); setError("");
    try {
      const result = await importQuestionBank({
        fileName: preview.file.name,
        format: preview.file.name.toLowerCase().endsWith(".json") ? "json" : "csv",
        rawText: preview.text,
        rows: preview.rows,
        bank: importBank,
        skipDuplicates,
        publishImmediately,
      });
      setReport(result.report);
      setMessage(publishImmediately
        ? `${result.report.accepted} questions imported and published. They are now available to students.`
        : `${result.report.accepted} questions imported as drafts for optional enrichment and review.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed.");
    } finally { setImporting(false); }
  };

  const publishDrafts = async () => {
    setPublishingDrafts(true); setError(""); setMessage("");
    try {
      const result = await publishAllDraftQuestions();
      setMessage(`${result.updated} draft questions published. Quiz and Practice now use them.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Draft questions could not be published.");
    } finally { setPublishingDrafts(false); }
  };

  const downloadTemplate = (kind: "mcq" | "general") => {
    const rows = {
      mcq: [
        "category,question_type,question_text,answer_text,difficulty,company_asked,option_1,option_2,option_3,option_4,correct_option,explanation,tags",
        '"Docker","MCQ","Which command lists running containers?","docker ps","Easy","Accenture|TCS","docker ps","docker ls","docker run","docker show","1","docker ps lists running containers.","docker|commands"',
      ],
      general: [
        "category,question_type,question_text,answer_text,difficulty,company_asked,explanation,tags",
        '"Kubernetes","scenario","Pods restart after deployment. How do you investigate?","Inspect events, logs, probes and resource limits.","Hard","Infosys|Cognizant","Use evidence to isolate application, probe, or resource failures.","kubernetes|troubleshooting"',
        '"Docker","general","What is a Docker image?","An immutable package containing an application and its dependencies.","Easy","TCS|Wipro","Images are built in layers.","docker|images"',
        '"Linux","troubleshooting","A server has high CPU. What do you check?","Inspect load, processes, logs and recent changes, then isolate the cause.","Medium","Accenture|Cognizant","Use evidence before remediation.","linux|cpu|incident"',
        '"Git","behavioral","Tell me about a production change you safely rolled back.","Explain the context, decision, rollback controls, communication and learning.","Medium","Deloitte|Capgemini","Use the STAR structure.","behavioral|rollback"',
      ],
    } as const;
    const sample = rows[kind].join("\n");
    const url = URL.createObjectURL(new Blob([sample], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `devopscrack-${kind}-template.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.025] px-3">
          <Search size={14} className="text-zinc-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search live questions…" className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
        </div>
        <Button variant="secondary" onClick={() => setImportOpen(true)}><Upload size={14} /> Bulk import</Button>
        {questions.some((item) => !item.is_published) && <Button variant="secondary" onClick={() => void publishDrafts()} disabled={publishingDrafts}><CheckCircle2 size={14} /> {publishingDrafts ? "Publishing…" : "Publish all drafts"}</Button>}
        <Button onClick={() => setEditor({ open: true, question: null })}><Plus size={14} /> Add question</Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Question bank filter">
        {(["all", "mcq", "general"] as const).map((bank) => {
          const count = bank === "all" ? questions.length : questions.filter((item) => item.bank === bank).length;
          const label = bank === "all" ? "All questions" : bank === "mcq" ? "MCQs" : "General questions";
          return <button key={bank} onClick={() => setBankFilter(bank)} className={`rounded-xl border px-4 py-2 text-[10px] font-medium transition ${bankFilter === bank ? "border-violet-400/25 bg-violet-400/10 text-violet-200" : "border-white/[.07] bg-white/[.02] text-zinc-500 hover:bg-white/[.05]"}`}>{label}<span className="ml-2 rounded-full bg-white/[.06] px-1.5 py-0.5 text-[9px]">{count}</span></button>;
        })}
      </div>

      {message && <p className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[.06] p-3 text-xs text-emerald-500">{message}</p>}
      {error && <p className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/[.06] p-3 text-xs text-rose-500">{error}</p>}

      <Card className="mt-4 overflow-hidden">
        {loading ? (
          <div className="grid min-h-56 place-items-center"><LoaderCircle className="animate-spin text-violet-400" /></div>
        ) : filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead><tr className="border-b border-white/[.06] text-[9px] uppercase tracking-wider text-zinc-600"><th className="px-5 py-3">Question</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Difficulty</th><th className="px-3 py-3">Companies</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
              <tbody>{visibleQuestions.map((question) => (
                <tr key={question.id} className="border-b border-white/[.05] last:border-0 hover:bg-white/[.02]">
                  <td className="max-w-xl px-5 py-4"><div className="flex items-center gap-2"><Badge tone={question.bank === "mcq" ? "violet" : "cyan"}>{question.bank === "mcq" ? "MCQ" : "General"}</Badge><p className="line-clamp-2 text-xs">{question.question_text}</p></div><p className="mt-1 text-[9px] text-zinc-600">{question.tags.join(", ") || "No tags"} · {question.is_published ? "Published" : "Draft"}</p></td>
                  <td className="px-3 py-4"><Badge>{question.categories?.name ?? "Unknown"}</Badge></td>
                  <td className="px-3 py-4"><Badge tone={question.difficulty === "Hard" ? "rose" : question.difficulty === "Medium" ? "amber" : "green"}>{question.difficulty}</Badge></td>
                  <td className="px-3 py-4 text-[10px] text-zinc-500">{question.company_asked.join(", ") || "—"}</td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={() => setEditor({ open: true, question })} className="grid size-9 place-items-center rounded-lg text-zinc-500 hover:bg-violet-400/10 hover:text-violet-400" aria-label="Edit question"><Pencil size={14} /></button><button onClick={() => void remove(question)} className="grid size-9 place-items-center rounded-lg text-zinc-500 hover:bg-rose-400/10 hover:text-rose-400" aria-label="Delete question"><Trash2 size={14} /></button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-60 place-items-center p-6 text-center"><div><FileSpreadsheet size={30} className="mx-auto text-violet-400" /><p className="mt-3 text-sm font-medium">No questions found</p><p className="mt-1 text-xs text-zinc-500">Add one manually or import your question bank.</p></div></div>
        )}
      </Card>
      {!loading && filtered.length > 0 && <div className="mt-4 flex flex-col gap-3 text-[10px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length.toLocaleString()} questions</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</Button>
          <span>Page {page} of {pageCount}</span>
          <Button variant="secondary" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>Next</Button>
        </div>
      </div>}

      <QuestionEditor
        state={editor}
        categories={categories}
        creatingCategories={creatingCategories}
        onCreateCategories={createCategories}
        onClose={() => setEditor({ open: false, question: null })}
        onSaved={async () => { setEditor({ open: false, question: null }); setMessage("Question saved successfully."); await refresh(); }}
      />

      <Dialog.Root open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) { setPreview(null); setReport(null); setImportBank(null); setSkipDuplicates(true); setPublishImmediately(true); } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] max-h-[92vh] w-[calc(100%-24px)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-white/10 bg-[var(--panel)] p-6 shadow-2xl">
            <div className="flex items-center justify-between"><Dialog.Title className="text-lg font-semibold">Import question bank</Dialog.Title><Dialog.Close className="grid size-9 place-items-center rounded-xl text-zinc-500 hover:bg-white/[.06]"><X size={17} /></Dialog.Close></div>
            <Dialog.Description className="mt-2 text-xs leading-5 text-zinc-500">Choose a bank first. MCQs and general interview content are stored and validated separately.</Dialog.Description>
            {!importBank && <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button onClick={() => setImportBank("mcq")} className="rounded-2xl border border-violet-400/20 bg-violet-400/[.05] p-6 text-left transition hover:-translate-y-0.5 hover:bg-violet-400/[.09]"><FileSpreadsheet className="text-violet-400" /><span className="mt-4 block text-sm font-semibold">MCQ bank</span><span className="mt-2 block text-[10px] leading-5 text-zinc-500">Options, correct answer and explanation. Used by MCQ, Rapid Fire and Adaptive modes.</span></button>
              <button onClick={() => setImportBank("general")} className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[.05] p-6 text-left transition hover:-translate-y-0.5 hover:bg-cyan-400/[.09]"><FileJson className="text-cyan-400" /><span className="mt-4 block text-sm font-semibold">General bank</span><span className="mt-2 block text-[10px] leading-5 text-zinc-500">General, scenario, troubleshooting and behavioral questions. Used by Practice, Interview, Mock and Flashcards.</span></button>
            </div>}
            {importBank && !preview && <div className="mt-6">
              <div className="flex items-center justify-between rounded-xl border border-white/[.07] bg-white/[.025] p-3"><span className="text-xs"><strong className="capitalize">{importBank}</strong> question bank</span><button onClick={() => setImportBank(null)} className="text-[10px] text-violet-400">Change bank</button></div>
              <button onClick={() => fileRef.current?.click()} className="mt-3 grid min-h-40 w-full place-items-center rounded-2xl border border-dashed border-violet-400/25 bg-violet-400/[.04] text-center transition hover:bg-violet-400/[.08]"><span><Upload size={30} className="mx-auto text-cyan-400" /><span className="mt-3 block text-sm font-medium">Choose CSV or JSON</span><span className="mt-1 block text-[10px] text-zinc-500">Maximum 10 MB</span></span></button>
              <button onClick={() => downloadTemplate(importBank)} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/[.08] text-xs text-violet-400 hover:bg-white/[.04]"><Download size={14} /> Download {importBank === "mcq" ? "MCQ" : "General"} template</button>
            </div>}
            <input ref={fileRef} type="file" accept=".csv,.json,text/csv,application/json" className="hidden" onChange={(event) => void previewFile(event.target.files?.[0])} />
            {preview && !report && <div className="mt-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <ImportStat label="Rows detected" value={preview.rows.length} tone="violet" />
                <ImportStat label="Locally valid" value={preview.rows.length - preview.localInvalid.length} tone="green" />
                <ImportStat label="Invalid rows" value={preview.localInvalid.length} tone={preview.localInvalid.length ? "rose" : "green"} />
              </div>
              <div className="mt-4 max-h-56 overflow-auto rounded-2xl border border-white/[.07]">
                <table className="w-full min-w-[640px] text-left text-[10px]"><thead><tr className="border-b border-white/[.06] text-zinc-600"><th className="p-3">Row</th><th className="p-3">Category</th><th className="p-3">Question</th><th className="p-3">Validation</th></tr></thead>
                  <tbody>{preview.rows.slice(0, 50).map((row, index) => {
                    const issue = preview.localInvalid.find((item) => item.rowNumber === index + 2);
                    return <tr key={index} className="border-b border-white/[.04] last:border-0"><td className="p-3 text-zinc-600">{index + 2}</td><td className="p-3">{String(row.category ?? row.category_slug ?? "—")}</td><td className="max-w-md p-3"><span className="line-clamp-2">{String(row.question_text ?? row.question ?? "—")}</span></td><td className="p-3">{issue ? <span className="text-rose-400">{issue.reason}</span> : <span className="text-emerald-400">Ready</span>}</td></tr>;
                  })}</tbody></table>
              </div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setPreview(null)}>Choose another file</Button><Button onClick={() => void commitImport()} disabled={importing}>{importing ? <><LoaderCircle size={14} className="animate-spin" /> Importing…</> : <><Upload size={14} /> Import valid rows</>}</Button></div>
              <label className="mt-4 flex items-center gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[.04] p-3 text-xs text-zinc-400"><input type="checkbox" checked={skipDuplicates} onChange={(event) => setSkipDuplicates(event.target.checked)} className="size-4 accent-violet-500" /> Skip duplicate questions and upload every other valid row</label>
              <label className="mt-3 flex items-start gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[.04] p-3 text-xs text-zinc-400"><input type="checkbox" checked={publishImmediately} onChange={(event) => setPublishImmediately(event.target.checked)} className="mt-0.5 size-4 accent-emerald-500" /><span><strong className="block text-emerald-300">Publish valid questions immediately</strong><span className="mt-1 block text-[10px] leading-4 text-zinc-500">Recommended when your file already contains answers, MCQ options and correct options. OpenAI is not required.</span></span></label>
            </div>}
            {report && <div className="mt-6">
              <div className="grid gap-3 sm:grid-cols-3"><ImportStat label="Inserted" value={report.accepted} tone="green" /><ImportStat label="Duplicates skipped" value={report.duplicates.length} tone="amber" /><ImportStat label="Invalid skipped" value={report.invalid.length} tone="rose" /></div>
              {(report.invalid.length > 0 || report.duplicates.length > 0) && <div className="mt-4 max-h-52 overflow-auto rounded-2xl border border-white/[.07] p-4 text-[10px]">
                {report.invalid.map((item) => <p key={`i-${item.rowNumber}`} className="mb-2 flex gap-2 text-rose-300"><AlertTriangle size={13} className="shrink-0" /> Row {item.rowNumber}: {item.errors.join("; ")}</p>)}
                {report.duplicates.map((item) => <p key={`d-${item.rowNumber}`} className="mb-2 flex gap-2 text-amber-300"><AlertTriangle size={13} className="shrink-0" /> Row {item.rowNumber}: duplicate question skipped</p>)}
              </div>}
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[.05] p-4 text-xs text-emerald-300"><CheckCircle2 size={18} /> {publishImmediately ? "Import completed and published. Student Quiz and Practice can use these questions now." : "Import completed as draft. Open AI Engine for optional enrichment and approval."}</div>
            </div>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function ImportStat({ label, value, tone }: { label: string; value: number; tone: "violet" | "green" | "rose" | "amber" }) {
  const colors = { violet: "border-violet-400/15 bg-violet-400/[.05] text-violet-300", green: "border-emerald-400/15 bg-emerald-400/[.05] text-emerald-300", rose: "border-rose-400/15 bg-rose-400/[.05] text-rose-300", amber: "border-amber-400/15 bg-amber-400/[.05] text-amber-300" };
  return <div className={`rounded-2xl border p-4 ${colors[tone]}`}><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-[9px] opacity-70">{label}</p></div>;
}

function QuestionEditor({
  state,
  categories,
  creatingCategories,
  onCreateCategories,
  onClose,
  onSaved,
}: {
  state: { open: boolean; question: AdminQuestion | null };
  categories: AdminCategory[];
  creatingCategories: boolean;
  onCreateCategories: () => Promise<void>;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const question = state.question;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const input: QuestionInput = {
      category_id: String(form.get("category_id") ?? ""),
      question_text: String(form.get("question_text") ?? "").trim(),
      answer_text: String(form.get("answer_text") ?? "").trim(),
      difficulty: String(form.get("difficulty") ?? "Medium") as QuestionInput["difficulty"],
      tags: splitList(String(form.get("tags") ?? "")),
      company_asked: splitList(String(form.get("company_asked") ?? "")),
      options: splitLines(String(form.get("options") ?? "")),
      correct_option: String(form.get("correct_option") ?? "") === "" ? null : Math.max(0, Number(form.get("correct_option")) - 1),
      is_published: form.get("is_published") === "on",
    };
    try {
      if (question) await updateAdminQuestion(question.id, { ...input, bank: question.bank }); else await createAdminQuestion(input);
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save question.");
    } finally { setSaving(false); }
  };
  return <Dialog.Root open={state.open} onOpenChange={(open) => !open && onClose()}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-[90] max-h-[92vh] w-[calc(100%-24px)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-white/10 bg-[var(--panel)] p-6 shadow-2xl"><div className="flex items-center justify-between"><Dialog.Title className="text-lg font-semibold">{question ? "Edit question" : "Add question"}</Dialog.Title><Dialog.Close className="grid size-9 place-items-center rounded-xl text-zinc-500 hover:bg-white/[.06]"><X size={17} /></Dialog.Close></div><Dialog.Description className="mt-1 text-xs text-zinc-500">Save directly to the production question bank.</Dialog.Description><form onSubmit={submit} className="mt-6 space-y-4">
    <Field label="Category">
      {categories.length ? (
        <select name="category_id" required defaultValue={question?.category_id ?? emptyInput.category_id} className="admin-input cursor-pointer">
          <option value="" disabled>Select category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      ) : (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-4">
          <p className="text-xs font-medium text-amber-200">No categories are available yet.</p>
          <p className="mt-1 text-[10px] leading-5 text-zinc-500">Create the standard DevOps categories, then select one for this question.</p>
          <Button type="button" variant="secondary" className="mt-3" onClick={() => void onCreateCategories()} disabled={creatingCategories}>
            {creatingCategories ? <><LoaderCircle size={14} className="animate-spin" /> Creating…</> : <><Plus size={14} /> Create categories</>}
          </Button>
        </div>
      )}
    </Field>
    <Field label="Question"><textarea name="question_text" required defaultValue={question?.question_text ?? ""} rows={3} className="admin-input resize-y" /></Field>
    <Field label="Expected answer"><textarea name="answer_text" required defaultValue={question?.answer_text ?? ""} rows={7} className="admin-input resize-y" /></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Difficulty"><select name="difficulty" defaultValue={question?.difficulty ?? "Medium"} className="admin-input"><option>Easy</option><option>Medium</option><option>Hard</option></select></Field><Field label="Companies (comma separated)"><input name="company_asked" defaultValue={question?.company_asked.join(", ") ?? ""} className="admin-input" /></Field></div>
    <Field label="Tags (comma separated)"><input name="tags" defaultValue={question?.tags.join(", ") ?? ""} className="admin-input" /></Field>
    <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
      <Field label="MCQ options (one per line, optional)"><textarea name="options" defaultValue={question?.options?.join("\n") ?? ""} rows={4} className="admin-input resize-y" placeholder={"Option A\nOption B\nOption C\nOption D"} /></Field>
      <Field label="Correct option number"><input name="correct_option" type="number" min={1} max={8} defaultValue={typeof question?.correct_option === "number" ? question.correct_option + 1 : ""} className="admin-input" placeholder="1" /></Field>
    </div>
    <label className="flex items-center gap-3 text-xs"><input name="is_published" type="checkbox" defaultChecked={question?.is_published ?? true} className="size-4 accent-violet-500" /> Publish immediately</label>
    {error && <p className="rounded-xl border border-rose-400/15 bg-rose-400/[.06] p-3 text-xs text-rose-400">{error}</p>}
    <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving || !categories.length}>{saving ? "Saving…" : "Save question"}</Button></div>
  </form></Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-medium text-zinc-500">{label}</span>{children}</label>;
}

function splitList(value: string) { return value.split(/[|,]/).map((part) => part.trim()).filter(Boolean); }
function splitLines(value: string) { const rows = value.split(/\r?\n/).map((part) => part.trim()).filter(Boolean); return rows.length ? rows : null; }

function parseJson(text: string): Record<string, unknown>[] {
  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.questions) ? parsed.questions : null;
  if (!rows) throw new Error("JSON must be an array or contain a questions array.");
  return rows;
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') { if (quoted && text[index + 1] === '"') { cell += '"'; index++; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[index + 1] === "\n") index++; row.push(cell); if (row.some(Boolean)) lines.push(row); row = []; cell = ""; }
    else cell += char;
  }
  row.push(cell); if (row.some(Boolean)) lines.push(row);
  const headers = lines.shift()?.map((item) => item.trim()) ?? [];
  return lines.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])));
}
