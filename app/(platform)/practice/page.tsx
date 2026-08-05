"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as Slider from "@radix-ui/react-slider";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Eye,
  Filter,
  Lightbulb,
  ListFilter,
  LockKeyhole,
  MessageSquareText,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge, Button, Card } from "@/components/ui";
import { useContentCatalog } from "@/lib/hooks/use-content-catalog";
import { difficultyTone } from "@/lib/utils";
import { questionState, statusOptions, useAppStore } from "@/lib/store";
import type { Difficulty, ProgressStatus, Question } from "@/lib/types";
import { CategoryUniverse } from "@/components/three/category-universe";

function MarkdownAnswer({ answer }: { answer: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-4 text-sm leading-7 text-zinc-300">{children}</p>,
        ol: ({ children }) => <ol className="mb-4 ml-5 list-decimal space-y-2 text-sm leading-7 text-zinc-300">{children}</ol>,
        ul: ({ children }) => <ul className="mb-4 ml-5 list-disc space-y-2 text-sm leading-7 text-zinc-300">{children}</ul>,
        code: ({ children }) => (
          <code className="rounded-md border border-cyan-400/10 bg-cyan-400/[.055] px-1.5 py-0.5 font-mono text-[12px] text-cyan-200">
            {children}
          </code>
        ),
      }}
    >
      {answer}
    </ReactMarkdown>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-white/[.06] py-5 last:border-0">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.14em] text-zinc-600">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function CheckboxFilter({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button onClick={onChange} className="group flex w-full items-center gap-2.5 rounded-lg py-1.5 text-left">
      <span
        className={`grid size-4 place-items-center rounded border transition-colors ${
          checked ? "border-violet-400 bg-violet-500 text-white" : "border-white/10 bg-white/[.025] group-hover:border-white/20"
        }`}
      >
        {checked && <Check size={10} />}
      </span>
      <span className={`text-[11px] ${checked ? "text-zinc-200" : "text-zinc-500"}`}>{label}</span>
      {count !== undefined && <span className="ml-auto text-[9px] text-zinc-700">{count}</span>}
    </button>
  );
}

function QuestionDetail({
  question,
  index,
  total,
  onNext,
  onPrevious,
  onClose,
}: {
  question: Question;
  index: number;
  total: number;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const { progress, updateQuestion, addXp } = useAppStore();
  const state = questionState(progress, question.id);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key.toLowerCase() === "j") onNext();
      if (event.key.toLowerCase() === "k") onPrevious();
      if (event.key === " ") {
        event.preventDefault();
        setRevealed(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNext, onPrevious]);

  const setStatus = (status: ProgressStatus) => {
    updateQuestion(question.id, { status });
    const transitionKey = `${question.id}:${state.status}:${status}`;
    if (status === "Mastered" && state.status !== "Mastered") addXp(20, transitionKey);
    if (status !== "Mastered" && state.status === "Mastered") addXp(-20, transitionKey);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-[55] overflow-y-auto bg-[#09090b] lg:absolute lg:inset-0"
    >
      <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-white/[.07] bg-[#0b0b0d]/90 px-4 backdrop-blur-xl sm:px-6">
        <button onClick={onClose} className="grid size-9 place-items-center rounded-xl text-zinc-500 hover:bg-white/[.06] hover:text-white" aria-label="Close question">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] text-zinc-600">Question {index + 1} of {total}</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="truncate text-xs font-medium">{question.category}</p>
            <Badge tone={difficultyTone(question.difficulty)}>{question.difficulty}</Badge>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => updateQuestion(question.id, { bookmarked: !state.bookmarked })}
            className={`grid size-9 place-items-center rounded-xl ${state.bookmarked ? "bg-violet-400/10 text-violet-300" : "text-zinc-500 hover:bg-white/[.06]"}`}
            aria-label="Bookmark question"
          >
            {state.bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>
          <button onClick={onPrevious} className="grid size-9 place-items-center rounded-xl text-zinc-500 hover:bg-white/[.06]" aria-label="Previous question"><ChevronLeft size={18} /></button>
          <button onClick={onNext} className="grid size-9 place-items-center rounded-xl text-zinc-500 hover:bg-white/[.06]" aria-label="Next question"><ChevronRight size={18} /></button>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-64px)] lg:grid-cols-2">
        <section className="border-b border-white/[.07] p-5 sm:p-8 lg:border-b-0 lg:border-r lg:p-10 xl:p-14">
          <div className="mx-auto max-w-2xl">
            <div className="flex flex-wrap gap-2">
              {question.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
            </div>
            <p className="mt-8 text-xl font-medium leading-8 tracking-[-.02em] sm:text-2xl sm:leading-9">{question.question}</p>
            <div className="mt-8 rounded-2xl border border-white/[.07] bg-white/[.025] p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><Lightbulb size={16} /></span>
                <div>
                  <p className="text-xs font-medium">Structure your answer</p>
                  <p className="mt-1 text-[11px] leading-5 text-zinc-600">Start with your approach, explain the commands or evidence you would collect, then finish with root cause and prevention.</p>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-zinc-600">Asked at</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {question.companies.map((company) => (
                  <span key={company} className="rounded-lg border border-white/[.07] bg-white/[.03] px-2.5 py-1.5 text-[10px] text-zinc-500">{company}</span>
                ))}
              </div>
            </div>
            <div className="mt-10">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.14em] text-zinc-600">How confident are you?</p>
              <div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4">
                <Slider.Root
                  value={[state.confidence]}
                  onValueChange={([value]) => updateQuestion(question.id, { confidence: value })}
                  min={1}
                  max={5}
                  step={1}
                  className="relative flex h-5 w-full touch-none select-none items-center"
                >
                  <Slider.Track className="relative h-1.5 grow rounded-full bg-white/[.08]">
                    <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400" />
                  </Slider.Track>
                  <Slider.Thumb className="block size-5 rounded-full border-2 border-white bg-violet-500 shadow-lg" />
                </Slider.Root>
                <div className="mt-2 flex justify-between text-[9px] text-zinc-700">
                  <span>Guessing</span><span>Unsure</span><span>Okay</span><span>Good</span><span>Expert</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative min-h-[560px] p-5 sm:p-8 lg:p-10 xl:p-14">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-violet-400">Expert answer</p>
                <h2 className="mt-1 text-lg font-semibold">Production-ready explanation</h2>
              </div>
              {revealed && <Badge tone="green"><Eye size={11} className="mr-1" /> Revealed</Badge>}
            </div>

            <div className="relative mt-6 min-h-[350px] overflow-hidden rounded-2xl border border-white/[.07] bg-[#0d0d0f] p-5 sm:p-6">
              <div className={revealed ? "" : "select-none blur-[7px] opacity-35"}>
                <MarkdownAnswer answer={question.answer} />
              </div>
              <AnimatePresence>
                {!revealed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 grid place-items-center bg-gradient-to-b from-transparent via-[#0d0d0f]/55 to-[#0d0d0f]"
                  >
                    <div className="max-w-xs text-center">
                      <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-violet-400/15 bg-violet-400/10 text-violet-300"><LockKeyhole size={21} /></span>
                      <p className="mt-4 text-sm font-medium">Think before you reveal</p>
                      <p className="mt-2 text-[11px] leading-5 text-zinc-600">Say your answer out loud. Active recall makes the concept stick.</p>
                      <Button className="mt-5" onClick={() => setRevealed(true)}><Sparkles size={14} /> Reveal answer</Button>
                      <p className="mt-3 font-mono text-[9px] text-zinc-700">Press Space to reveal</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {revealed && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatus(status)}
                      className={`rounded-xl border px-3 py-2.5 text-[10px] font-medium transition ${
                        state.status === status
                          ? status === "Mastered"
                            ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                            : status === "Need Revision"
                              ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                              : "border-violet-400/25 bg-violet-400/10 text-violet-300"
                          : "border-white/[.07] bg-white/[.025] text-zinc-600 hover:text-zinc-300"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowNote(!showNote)}
                  className="mt-4 flex w-full items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-3 text-left text-xs text-zinc-500 hover:text-zinc-300"
                >
                  <MessageSquareText size={15} />
                  {state.note ? "Edit personal note" : "Add a personal note"}
                  <ChevronDown size={14} className={`ml-auto transition-transform ${showNote ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {showNote && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <textarea
                        value={state.note}
                        onChange={(event) => updateQuestion(question.id, { note: event.target.value })}
                        placeholder="Add your own explanation, command, or interview story..."
                        className="mt-2 min-h-28 w-full resize-y rounded-xl border border-white/[.08] bg-white/[.025] p-3 text-xs leading-5 text-zinc-300 placeholder:text-zinc-700 focus:border-violet-400/30"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </section>
      </div>

      <div className="fixed bottom-4 left-1/2 hidden -translate-x-1/2 items-center gap-3 rounded-full border border-white/[.08] bg-[#151517]/90 px-4 py-2 text-[9px] text-zinc-600 shadow-xl backdrop-blur lg:flex">
        <span><kbd className="rounded border border-white/[.08] px-1.5 py-0.5">K</kbd> Previous</span>
        <span className="h-3 w-px bg-white/[.08]" />
        <span><kbd className="rounded border border-white/[.08] px-1.5 py-0.5">J</kbd> Next</span>
      </div>
    </motion.div>
  );
}

function PracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category");
  const initialQuestion = searchParams.get("question");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [statuses, setStatuses] = useState<ProgressStatus[]>([]);
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(initialQuestion);
  const [mobileFilters, setMobileFilters] = useState(false);
  const { questions: liveQuestions, categories } = useContentCatalog();
  const { progress, updateQuestion } = useAppStore();

  const filtered = useMemo(() => {
    return liveQuestions.filter((question) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        question.question.toLowerCase().includes(term) ||
        question.tags.some((tag) => tag.includes(term));
      const matchesCategory = !category || question.categorySlug === category || (["cicd", "ci-cd"].includes(category) && ["cicd", "ci-cd"].includes(question.categorySlug));
      const matchesDifficulty = !difficulties.length || difficulties.includes(question.difficulty);
      const currentStatus = questionState(progress, question.id).status;
      const matchesStatus = !statuses.length || statuses.includes(currentStatus);
      const matchesBookmark = !bookmarkedOnly || questionState(progress, question.id).bookmarked;
      return matchesSearch && matchesCategory && matchesDifficulty && matchesStatus && matchesBookmark;
    });
  }, [search, category, difficulties, statuses, bookmarkedOnly, progress, liveQuestions]);

  const selectedIndex = Math.max(0, filtered.findIndex((question) => question.id === selected));
  const selectedQuestion = filtered.find((question) => question.id === selected) ?? liveQuestions.find((question) => question.id === selected);

  const showQuestion = (id: string | null) => {
    setSelected(id);
    if (id) {
      const currentState = questionState(progress, id);
      if (currentState.status === "Not Started") updateQuestion(id, { status: "Seen" });
    }
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (id) params.set("question", id);
    router.replace(`/practice${params.toString() ? `?${params}` : ""}`, { scroll: false });
  };

  const next = useCallback(() => {
    if (!filtered.length) return;
    const nextIndex = (selectedIndex + 1) % filtered.length;
    showQuestion(filtered[nextIndex].id);
  }, [filtered, selectedIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const previous = useCallback(() => {
    if (!filtered.length) return;
    const previousIndex = (selectedIndex - 1 + filtered.length) % filtered.length;
    showQuestion(filtered[previousIndex].id);
  }, [filtered, selectedIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDifficulty = (item: Difficulty) =>
    setDifficulties((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  const toggleStatus = (item: ProgressStatus) =>
    setStatuses((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);

  const filters = (
    <>
      <div className="flex items-center justify-between border-b border-white/[.07] pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold"><ListFilter size={16} className="text-violet-400" /> Filters</div>
        {(category || difficulties.length || statuses.length || bookmarkedOnly) ? (
          <button onClick={() => { setCategory(null); setDifficulties([]); setStatuses([]); setBookmarkedOnly(false); }} className="text-[10px] text-zinc-600 hover:text-violet-300">Clear all</button>
        ) : null}
      </div>
      <FilterGroup title="Category">
        <CheckboxFilter label="All categories" count={liveQuestions.length} checked={!category} onChange={() => setCategory(null)} />
        {categories.map((item) => (
          <CheckboxFilter
            key={item.slug}
            label={item.name}
            count={liveQuestions.filter((q) => q.categorySlug === item.slug).length}
            checked={category === item.slug}
            onChange={() => setCategory(category === item.slug ? null : item.slug)}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="Difficulty">
        {(["Easy", "Medium", "Hard"] as Difficulty[]).map((item) => (
          <CheckboxFilter key={item} label={item} checked={difficulties.includes(item)} onChange={() => toggleDifficulty(item)} />
        ))}
      </FilterGroup>
      <FilterGroup title="Progress">
        {statusOptions.map((item) => (
          <CheckboxFilter key={item} label={item} checked={statuses.includes(item)} onChange={() => toggleStatus(item)} />
        ))}
        <CheckboxFilter label="Bookmarked only" checked={bookmarkedOnly} onChange={() => setBookmarkedOnly((value) => !value)} />
      </FilterGroup>
      <FilterGroup title="Company">
        {["Accenture", "Tata Consultancy Services (TCS)", "Infosys", "Cognizant", "Capgemini"].map((item) => (
          <CheckboxFilter key={item} label={item} checked={false} onChange={() => {}} />
        ))}
      </FilterGroup>
    </>
  );

  return (
    <div className="relative min-h-[calc(100vh-72px)]">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.17em] text-violet-400">Practice library</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Question Bank</h1>
            <p className="mt-2 text-xs text-zinc-500">Master real questions asked in DevOps interviews.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileFilters(true)} className="grid size-10 place-items-center rounded-xl border border-white/[.08] bg-white/[.035] text-zinc-400 xl:hidden"><Filter size={17} /></button>
            <div className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.035] px-3 sm:w-72">
              <Search size={15} className="text-zinc-600" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions..." className="min-w-0 flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-700" />
            </div>
          </div>
        </div>

        <section className="relative mt-6 overflow-hidden rounded-[28px] border border-white/[.08] bg-[#08080b] shadow-[0_30px_100px_rgba(0,0,0,.35)]">
          <div className="cinematic-grid absolute inset-0 opacity-35" />
          <div className="relative h-[460px] sm:h-[390px]">
            <CategoryUniverse activeSlug={category} onSelect={(slug) => setCategory(category === slug ? null : slug)} />
            <div className="pointer-events-none absolute left-5 top-5 z-10 max-w-xs sm:left-7 sm:top-7">
              <Badge tone="violet">Spatial knowledge map</Badge>
              <h2 className="mt-3 text-xl font-semibold tracking-[-.035em] sm:text-2xl">Choose a system to enter.</h2>
              <p className="mt-2 text-[10px] leading-5 text-zinc-500">Select an infrastructure object to focus the question library.</p>
            </div>
            <div className="absolute inset-x-4 bottom-4 z-10 flex gap-2 overflow-x-auto pb-1 sm:inset-x-6 sm:grid sm:grid-cols-10 sm:overflow-visible">
              {categories.map((item) => (
                <button
                  key={item.slug}
                  onClick={() => setCategory(category === item.slug ? null : item.slug)}
                  className={`min-w-[92px] shrink-0 rounded-lg border px-2 py-2.5 text-[8px] uppercase tracking-[.08em] backdrop-blur-md transition sm:min-w-0 sm:text-[9px] ${
                    category === item.slug
                      ? "border-violet-400/35 bg-violet-400/15 text-white shadow-[0_0_24px_rgba(139,92,246,.18)]"
                      : "border-white/[.07] bg-black/40 text-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-5 xl:grid-cols-[220px_1fr]">
          <aside className="hidden rounded-2xl border border-white/[.07] bg-[var(--panel)] p-4 xl:block">{filters}</aside>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] text-zinc-600"><span className="text-zinc-300">{filtered.length}</span> questions found</p>
              <button className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-500 hover:bg-white/[.04]"><SlidersHorizontal size={13} /> Most relevant <ChevronDown size={12} /></button>
            </div>
            {filtered.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {filtered.map((question, index) => {
                  const state = questionState(progress, question.id);
                  return (
                    <motion.button
                      key={question.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.025, 0.2) }}
                      whileHover={{ y: -3 }}
                      onClick={() => showQuestion(question.id)}
                      className="group rounded-2xl border border-white/[.07] bg-[var(--panel)] p-5 text-left shadow-[0_16px_50px_rgba(0,0,0,.09)] transition-colors hover:border-violet-400/20"
                    >
                      <div className="flex items-center gap-2">
                        <Badge tone={difficultyTone(question.difficulty)}>{question.difficulty}</Badge>
                        <Badge>{question.category}</Badge>
                        {state.bookmarked && <BookmarkCheck size={14} className="ml-auto text-violet-400" />}
                      </div>
                      <h2 className="mt-4 line-clamp-3 min-h-[66px] text-sm font-medium leading-[22px] text-zinc-200">{question.question}</h2>
                      <div className="mt-5 flex items-center gap-2 border-t border-white/[.06] pt-4">
                        <span className={`flex items-center gap-1.5 text-[10px] ${
                          state.status === "Mastered" ? "text-emerald-400" : state.status === "Need Revision" ? "text-amber-400" : "text-zinc-600"
                        }`}>
                          {state.status === "Mastered" ? <CheckCircle2 size={12} /> : state.status === "Need Revision" ? <RotateCcw size={12} /> : <CircleHelp size={12} />}
                          {state.status}
                        </span>
                        <span className="ml-auto text-[9px] text-zinc-700">{question.bookmarks.toLocaleString()} saves</span>
                        <ChevronRight size={15} className="text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-400" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <Card className="grid min-h-[420px] place-items-center p-8 text-center">
                <div>
                  <span className="mx-auto grid size-16 place-items-center rounded-[22px] bg-violet-400/10 text-violet-300"><Search size={26} /></span>
                  <h2 className="mt-5 text-base font-semibold">No matching questions</h2>
                  <p className="mt-2 text-xs text-zinc-600">Try removing a filter or searching with a broader keyword.</p>
                  <Button variant="secondary" className="mt-5" onClick={() => { setSearch(""); setCategory(null); setDifficulties([]); setStatuses([]); setBookmarkedOnly(false); }}>Reset filters</Button>
                </div>
              </Card>
            )}
          </section>
        </div>
      </div>

      <AnimatePresence>
        {selectedQuestion && (
          <QuestionDetail
            key={selectedQuestion.id}
            question={selectedQuestion}
            index={selectedIndex}
            total={filtered.length || liveQuestions.length}
            onNext={next}
            onPrevious={previous}
            onClose={() => showQuestion(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileFilters && (
          <>
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileFilters(false)} className="fixed inset-0 z-[55] bg-black/70 backdrop-blur-sm xl:hidden" aria-label="Close filters" />
            <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed inset-y-0 right-0 z-[60] w-[84vw] max-w-[330px] overflow-y-auto bg-[#0e0e10] p-5 xl:hidden">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-semibold">Filter questions</p>
                <button onClick={() => setMobileFilters(false)} className="grid size-9 place-items-center rounded-xl bg-white/[.05] text-zinc-500"><X size={17} /></button>
              </div>
              {filters}
              <Button className="mt-4 w-full" onClick={() => setMobileFilters(false)}>Show {filtered.length} questions</Button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-zinc-500">Loading question bank…</div>}>
      <PracticeContent />
    </Suspense>
  );
}
