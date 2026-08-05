"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Gauge,
  Lightbulb,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  Timer,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { Badge, Button, Card, ProgressBar } from "@/components/ui";
import { useContentCatalog } from "@/lib/hooks/use-content-catalog";
import {
  calculateSelfRatedScore,
  getModeQuestions,
  nextAdaptiveDifficulty,
  pickAdaptiveQuestion,
  selectBalancedQuestions,
} from "@/lib/quiz/engine";
import { difficultyTone } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import type { Difficulty, Question, QuizMode } from "@/lib/types";
import { hiringCompanies } from "@/lib/company-catalog";
import { quizXp } from "@/lib/gamification";

type QuizStage = "setup" | "active" | "complete";
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

const modes: Array<{ name: QuizMode; note: string }> = [
  { name: "MCQ", note: "Automatic scoring" },
  { name: "Interview", note: "Write or speak" },
  { name: "Scenario", note: "Detailed response" },
  { name: "Rapid Fire", note: "20 sec each" },
  { name: "Hands-on", note: "Commands and code" },
  { name: "Adaptive", note: "Difficulty adjusts" },
];

const modeInstructions: Record<QuizMode, string> = {
  MCQ: "Choose the best answer. Your score is calculated automatically.",
  Interview: "Answer as you would in an interview, reveal the reference answer, then self-rate.",
  Scenario: "Explain your diagnosis, actions, trade-offs, and verification steps in detail.",
  "Rapid Fire": "Give a concise answer before the 20-second question timer expires.",
  "Hands-on": "Write the commands, configuration, or code you would use to complete the task.",
  Adaptive: "The first question is Medium. Correct answers increase difficulty; incorrect answers reduce it.",
};

function uniqueQuestions(items: Question[]) {
  return items.filter((question, index, all) => all.findIndex((item) => item.id === question.id) === index);
}

export default function QuizPage() {
  const { categories, generalQuestions, mcqQuestions, loading: contentLoading, error: contentError } = useContentCatalog();
  const [stage, setStage] = useState<QuizStage>("setup");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [duration, setDuration] = useState(10);
  const [mode, setMode] = useState<QuizMode>("Adaptive");
  const [difficulty, setDifficulty] = useState("Mixed");
  const [company, setCompany] = useState("Any company");
  const [experience, setExperience] = useState("3–5 years");
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [writtenAnswers, setWrittenAnswers] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [rapidTimeLeft, setRapidTimeLeft] = useState(20);
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState<Difficulty>("Medium");
  const [listening, setListening] = useState(false);
  const [speechMessage, setSpeechMessage] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorded = useRef(false);
  const recordQuizAttempt = useAppStore((state) => state.recordQuizAttempt);
  const quizHistory = useAppStore((state) => state.quizAttempts);

  const filters = useMemo(() => ({
    categorySlugs: selectedCategories,
    difficulty: mode === "Adaptive" ? "Mixed" : difficulty,
    company,
  }), [company, difficulty, mode, selectedCategories]);

  const availableQuestions = useMemo(() => getModeQuestions(
    ["MCQ", "Rapid Fire", "Adaptive"].includes(mode) ? mcqQuestions : generalQuestions,
    mode,
    filters,
  ), [filters, generalQuestions, mcqQuestions, mode]);

  // Every matching published question is included in normal sessions.
  // Adaptive mode keeps a target because it builds its question list live.
  const sessionTargetCount = mode === "Adaptive" ? questionCount : availableQuestions.length;

  const categoryQuestionCounts = useMemo(() => {
    const bank = ["MCQ", "Rapid Fire", "Adaptive"].includes(mode) ? mcqQuestions : generalQuestions;
    return Object.fromEntries(categories.map((category) => [
      category.slug,
      uniqueQuestions(getModeQuestions(bank, mode, {
        categorySlugs: [category.slug],
        difficulty: mode === "Adaptive" ? "Mixed" : difficulty,
        company,
      })).length,
    ]));
  }, [categories, company, difficulty, generalQuestions, mcqQuestions, mode]);

  const current = sessionQuestions[index];
  const isAutomatic = mode === "MCQ" || mode === "Adaptive";
  const automaticScore = sessionQuestions.reduce(
    (total, question) => total + (answers[question.id] === question.correctOption ? 1 : 0),
    0,
  );
  const selfRated = calculateSelfRatedScore(ratings, sessionQuestions);
  const score = isAutomatic ? automaticScore : selfRated.mastered;
  const accuracy = isAutomatic
    ? (sessionQuestions.length ? Math.round((score / sessionQuestions.length) * 100) : 0)
    : selfRated.accuracy;

  const start = () => {
    let selected: Question[];
    if (mode === "Adaptive") {
      const first = pickAdaptiveQuestion(availableQuestions, "Medium", []);
      selected = first ? [first] : [];
      setAdaptiveDifficulty("Medium");
    } else {
      selected = selectBalancedQuestions(
        uniqueQuestions(availableQuestions),
        availableQuestions.length,
        selectedCategories,
      );
    }
    if (!selected.length) return;
    setSessionQuestions(selected);
    setIndex(0);
    setAnswers({});
    setWrittenAnswers({});
    setRatings({});
    setRevealed({});
    setTimeLeft(duration * 60);
    setRapidTimeLeft(20);
    setSpeechMessage("");
    recorded.current = false;
    setStage("active");
  };

  const finish = useCallback(() => {
    if (!sessionQuestions.length) return;
    if (!recorded.current) {
      const weakCategories = sessionQuestions
        .filter((question) => isAutomatic
          ? answers[question.id] !== question.correctOption
          : (ratings[question.id] ?? 0) < 3)
        .map((question) => question.category);
      recordQuizAttempt({
        id: `QA-${Date.now().toString().slice(-6)}`,
        mode,
        score,
        total: sessionQuestions.length,
        timeSeconds: duration * 60 - timeLeft,
        categories: [...new Set(sessionQuestions.map((question) => question.category))],
        weakCategories: [...new Set(weakCategories)],
        createdAt: new Date().toISOString(),
      });
      recorded.current = true;
    }
    setStage("complete");
    if (accuracy >= 60) {
      confetti({ particleCount: 130, spread: 75, origin: { y: 0.65 }, colors: ["#8b5cf6", "#22d3ee", "#fbbf24"] });
    }
  }, [accuracy, answers, duration, isAutomatic, mode, ratings, recordQuizAttempt, score, sessionQuestions, timeLeft]);

  const advance = useCallback(() => {
    if (!current) return;
    if (mode === "Adaptive") {
      const correct = answers[current.id] === current.correctOption;
      const nextDifficulty = nextAdaptiveDifficulty(current.difficulty, correct);
      setAdaptiveDifficulty(nextDifficulty);
      if (sessionQuestions.length < questionCount) {
        const next = pickAdaptiveQuestion(availableQuestions, nextDifficulty, sessionQuestions.map((question) => question.id));
        if (next) {
          setSessionQuestions((items) => [...items, next]);
          setIndex((value) => value + 1);
          return;
        }
      }
      finish();
      return;
    }
    if (index >= sessionQuestions.length - 1) {
      finish();
    } else {
      setIndex((value) => value + 1);
      setRapidTimeLeft(20);
      setSpeechMessage("");
    }
  }, [answers, availableQuestions, current, finish, index, mode, questionCount, sessionQuestions]);

  useEffect(() => {
    if (stage !== "active") return;
    const timer = window.setTimeout(() => {
      if (timeLeft <= 1) {
        setTimeLeft(0);
        finish();
      } else {
        setTimeLeft((value) => value - 1);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [finish, stage, timeLeft]);

  useEffect(() => {
    if (stage !== "active" || mode !== "Rapid Fire" || !current) return;
    const timer = window.setTimeout(() => {
      if (rapidTimeLeft <= 1) {
        setRatings((items) => ({ ...items, [current.id]: items[current.id] ?? 1 }));
        advance();
      } else {
        setRapidTimeLeft((value) => value - 1);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [advance, current, mode, rapidTimeLeft, stage]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const toggleSpeech = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognitionConstructor = (
      window as typeof window & {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      }
    ).SpeechRecognition ?? (
      window as typeof window & { webkitSpeechRecognition?: new () => SpeechRecognitionLike }
    ).webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor || !current) {
      setSpeechMessage("Voice input is not supported in this browser. You can type your answer.");
      return;
    }
    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join(" ");
      setWrittenAnswers((items) => ({
        ...items,
        [current.id]: `${items[current.id] ?? ""} ${transcript}`.trim(),
      }));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setSpeechMessage("Microphone input stopped. Check browser microphone permission or type your answer.");
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setSpeechMessage("Listening… speak your answer clearly.");
  };

  const canAdvance = current
    ? isAutomatic
      ? answers[current.id] !== undefined
      : Boolean(writtenAnswers[current.id]?.trim()) && Boolean(revealed[current.id]) && Boolean(ratings[current.id])
    : false;

  const toggleCategory = (slug: string) => setSelectedCategories((items) =>
    items.includes(slug) ? items.filter((item) => item !== slug) : [...items, slug]);

  if (stage === "active" && current) {
    const chosen = answers[current.id];
    const response = writtenAnswers[current.id] ?? "";
    const isRevealed = Boolean(revealed[current.id]);
    const isLastQuestion = mode === "Adaptive"
      ? index >= sessionTargetCount - 1
      : index >= sessionQuestions.length - 1;
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex items-center gap-3">
          <button aria-label="Exit quiz" onClick={() => setStage("setup")} className="grid size-10 place-items-center rounded-xl border border-white/[.08] text-zinc-500 hover:bg-white/[.05]"><X size={17} /></button>
          <div className="flex-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-600">
              <span>Question {index + 1} of {mode === "Adaptive" ? sessionTargetCount : sessionQuestions.length}</span>
              <span>{mode === "Adaptive" ? `Adaptive target · ${adaptiveDifficulty}` : mode}</span>
            </div>
            <ProgressBar value={((index + 1) / (mode === "Adaptive" ? sessionTargetCount : sessionQuestions.length)) * 100} className="mt-2" />
          </div>
          <div className={`flex h-10 items-center gap-2 rounded-xl border px-3 font-mono text-xs ${(mode === "Rapid Fire" ? rapidTimeLeft : timeLeft) < 20 ? "border-rose-400/20 bg-rose-400/10 text-rose-300" : "border-white/[.08] bg-white/[.035] text-zinc-400"}`}>
            <Timer size={15} />
            {mode === "Rapid Fire"
              ? `00:${String(rapidTimeLeft).padStart(2, "0")}`
              : `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`}
          </div>
        </div>

        <motion.div key={current.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="mt-8">
          <Card className="overflow-hidden">
            <div className="border-b border-white/[.07] px-5 py-4 sm:px-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{current.category}</Badge>
                <Badge tone={difficultyTone(current.difficulty)}>{current.difficulty}</Badge>
                <Badge tone="violet">{mode}</Badge>
                <span className="ml-auto text-[10px] text-zinc-700">+40 correct · −10 incorrect</span>
              </div>
            </div>
            <div className="p-5 sm:p-8 lg:p-10">
              <p className="max-w-3xl text-lg font-medium leading-8 sm:text-xl">{current.question}</p>
              <p className="mt-3 text-xs leading-5 text-zinc-600">{modeInstructions[mode]}</p>

              {isAutomatic ? (
                <div className="mt-8 grid gap-3">
                  {current.options?.map((option, optionIndex) => {
                    const selected = chosen === optionIndex;
                    return (
                      <motion.button
                        key={`${current.id}-${optionIndex}`}
                        whileTap={{ scale: 0.995 }}
                        onClick={() => setAnswers((items) => ({ ...items, [current.id]: optionIndex }))}
                        className={`flex min-h-14 items-center gap-4 rounded-2xl border p-4 text-left text-sm transition ${selected ? "border-violet-400/35 bg-violet-400/[.09] text-violet-100" : "border-white/[.07] bg-white/[.025] text-zinc-400 hover:border-white/[.14] hover:bg-white/[.045]"}`}
                      >
                        <span className={`grid size-7 shrink-0 place-items-center rounded-lg border font-mono text-[10px] ${selected ? "border-violet-400 bg-violet-500 text-white" : "border-white/10 text-zinc-600"}`}>{String.fromCharCode(65 + optionIndex)}</span>
                        <span>{option}</span>
                        {selected && <Check size={16} className="ml-auto text-violet-300" />}
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-7">
                  <label className="text-[10px] font-medium uppercase tracking-[.16em] text-zinc-600">
                    {mode === "Hands-on" ? "Commands / code" : "Your response"}
                  </label>
                  <textarea
                    value={response}
                    onChange={(event) => setWrittenAnswers((items) => ({ ...items, [current.id]: event.target.value }))}
                    placeholder={mode === "Hands-on" ? "Enter commands, YAML, code, or implementation steps…" : "Type your answer here…"}
                    className={`mt-3 min-h-44 w-full resize-y rounded-2xl border border-white/[.08] bg-black/20 p-4 text-sm leading-6 text-zinc-200 outline-none transition focus:border-violet-400/40 focus:ring-4 focus:ring-violet-400/[.06] ${mode === "Hands-on" ? "font-mono" : ""}`}
                  />
                  {(mode === "Interview" || mode === "Scenario") && (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Button variant="secondary" onClick={toggleSpeech}>
                        {listening ? <MicOff size={14} /> : <Mic size={14} />}
                        {listening ? "Stop listening" : "Answer by voice"}
                      </Button>
                      {speechMessage && <span className="text-[10px] text-zinc-500">{speechMessage}</span>}
                    </div>
                  )}
                  {!isRevealed ? (
                    <Button className="mt-5" variant="secondary" disabled={!response.trim()} onClick={() => setRevealed((items) => ({ ...items, [current.id]: true }))}>
                      <Send size={14} /> Submit & reveal reference
                    </Button>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-2xl border border-cyan-400/15 bg-cyan-400/[.045] p-5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200"><Sparkles size={14} /> Reference answer</div>
                      <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-zinc-400">{current.answer || "No reference answer has been added yet."}</p>
                      <div className="mt-5 border-t border-white/[.06] pt-4">
                        <p className="text-[10px] text-zinc-500">How strong was your answer?</p>
                        <div className="mt-3 grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              onClick={() => setRatings((items) => ({ ...items, [current.id]: rating }))}
                              className={`rounded-xl border py-3 text-xs font-semibold transition ${ratings[current.id] === rating ? "border-violet-400/35 bg-violet-400/15 text-violet-200" : "border-white/[.07] text-zinc-600 hover:bg-white/[.04]"}`}
                              aria-label={`Rate answer ${rating} out of 5`}
                            >
                              {rating}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 flex justify-between text-[9px] text-zinc-700"><span>Needs revision</span><span>Interview ready</span></div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </Card>
          <div className="mt-5 flex items-center justify-between">
            <Button variant="ghost" disabled={index === 0 || mode === "Adaptive"} onClick={() => setIndex((value) => value - 1)}><ArrowLeft size={14} /> Previous</Button>
            <Button disabled={!canAdvance} onClick={advance}>
              {isLastQuestion ? "Finish" : "Next question"}
              {isLastQuestion ? <CheckCircle2 size={15} /> : <ArrowRight size={15} />}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (stage === "complete") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="overflow-hidden text-center">
            <div className="relative border-b border-white/[.07] bg-gradient-to-b from-violet-500/12 to-transparent px-6 py-12">
              <div className="premium-grid absolute inset-0 opacity-30" />
              <span className="relative mx-auto grid size-20 place-items-center rounded-[26px] border border-violet-400/20 bg-violet-400/10 text-violet-300"><Trophy size={34} /></span>
              <Badge tone={accuracy >= 60 ? "green" : "amber"} className="relative mt-5">{mode} complete</Badge>
              <h1 className="relative mt-4 text-3xl font-semibold tracking-[-.04em]">{accuracy >= 80 ? "Excellent work!" : accuracy >= 60 ? "Strong progress!" : "Good attempt—keep going."}</h1>
              <p className="relative mt-2 text-xs text-zinc-500">{isAutomatic ? "Your answers were scored automatically." : "Your result is based on your honest self-ratings."}</p>
            </div>
            <div className="grid grid-cols-3 gap-px bg-white/[.06]">
              {[[`${accuracy}%`, isAutomatic ? "Accuracy" : "Readiness"], [`${score}/${sessionQuestions.length}`, isAutomatic ? "Correct" : "Mastered"], [`${quizXp(score, sessionQuestions.length) >= 0 ? "+" : ""}${quizXp(score, sessionQuestions.length)}`, "Net XP"]].map(([value, label]) => (
                <div key={label} className="bg-[var(--panel)] px-3 py-6"><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-[10px] text-zinc-600">{label}</p></div>
              ))}
            </div>
            <div className="p-5 text-left sm:p-7">
              <h2 className="text-sm font-semibold">Answer review</h2>
              <div className="mt-4 space-y-2">
                {sessionQuestions.map((question, questionIndex) => {
                  const passed = isAutomatic ? answers[question.id] === question.correctOption : (ratings[question.id] ?? 0) >= 3;
                  return (
                    <div key={question.id} className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3">
                      <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${passed ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{passed ? <Check size={14} /> : <X size={14} />}</span>
                      <p className="line-clamp-1 text-xs text-zinc-400">{questionIndex + 1}. {question.question}</p>
                      <span className="ml-auto text-[9px] text-zinc-700">{isAutomatic ? (passed ? "Correct" : "Review") : `${ratings[question.id] ?? 0}/5`}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                <Button variant="secondary" onClick={() => setStage("setup")}>Back to setup</Button>
                <Button onClick={start}><RotateCcw size={14} /> Retry {mode}</Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  const availableCount = uniqueQuestions(availableQuestions).length;
  const noContentMessage = ["MCQ", "Rapid Fire", "Adaptive"].includes(mode)
    ? "No published MCQs match these filters. Add at least two answer options and a correct option in Admin."
    : `No published questions match the selected ${mode} filters.`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="text-center">
        <Badge tone="violet"><Zap size={11} className="mr-1" /> Six practice engines</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Build your practice session</h1>
        <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-zinc-500">Choose a mode and train with published questions from your live Supabase question bank.</p>
      </div>
      {contentLoading && <p className="mt-6 text-center text-xs text-zinc-500">Loading published questions…</p>}
      {contentError && <p className="mx-auto mt-6 max-w-xl rounded-xl border border-rose-400/15 bg-rose-400/[.05] p-3 text-center text-xs text-rose-300">{contentError}</p>}
      {!contentLoading && !contentError && !availableQuestions.length && <p className="mx-auto mt-6 max-w-xl rounded-xl border border-amber-400/15 bg-amber-400/[.05] p-3 text-center text-xs text-amber-300">{noContentMessage}</p>}

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="p-5 sm:p-7">
          <h2 className="text-sm font-semibold">1. Choose focus areas</h2>
          <p className="mt-1 text-[10px] text-zinc-600">Leave empty for all categories</p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.slice(0, 12).map((category) => {
              const selected = selectedCategories.includes(category.slug);
              return (
                <button key={category.slug} onClick={() => toggleCategory(category.slug)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-violet-400/25 bg-violet-400/[.08] text-violet-200" : "border-white/[.065] bg-white/[.022] text-zinc-500 hover:bg-white/[.04]"}`}>
                  <span className="grid size-8 place-items-center rounded-lg bg-white/[.045] text-[10px] font-semibold">{category.name.slice(0, 2).toUpperCase()}</span>
                  <span className="min-w-0 text-[11px] font-medium">
                    <span className="block truncate">{category.name}</span>
                    <span className={`mt-0.5 block text-[8px] font-normal ${selected ? "text-violet-300/65" : "text-zinc-700"}`}>
                      {categoryQuestionCounts[category.slug] ?? 0} questions
                    </span>
                  </span>
                  {selected && <Check size={13} className="ml-auto" />}
                </button>
              );
            })}
          </div>

          <div className="mt-8 border-t border-white/[.06] pt-7">
            <h2 className="text-sm font-semibold">2. Choose practice mode</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {modes.map((item) => (
                <button key={item.name} onClick={() => setMode(item.name)} className={`rounded-xl border px-3 py-3 text-left text-[11px] font-medium transition ${mode === item.name ? "border-violet-400/25 bg-violet-400/10 text-violet-200" : "border-white/[.07] text-zinc-600 hover:bg-white/[.035]"}`}>
                  {item.name}<span className={`mt-1 block text-[8px] font-normal ${mode === item.name ? "text-cyan-400" : "text-zinc-700"}`}>{item.note}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-cyan-400/10 bg-cyan-400/[.035] p-3 text-[10px] leading-5 text-zinc-500">{modeInstructions[mode]}</div>
          </div>

          <div className="mt-8 grid gap-7 border-t border-white/[.06] pt-7 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold">3. Questions in this session</h2>
              {mode === "Adaptive" ? (
                <><p className="mt-1 text-[9px] text-zinc-600">Choose the adaptive session target.</p><div className="mt-4 grid grid-cols-5 gap-2">{[5, 10, 20, 50, 100].map((value) => <button key={value} onClick={() => setQuestionCount(value)} className={`rounded-xl border py-3 text-xs font-medium ${questionCount === value ? "border-violet-400/25 bg-violet-400/10 text-violet-200" : "border-white/[.07] text-zinc-600"}`}>{value}</button>)}</div></>
              ) : (
                <div className="mt-3 rounded-xl border border-violet-400/15 bg-violet-400/[.055] p-4">
                  <p className="text-2xl font-semibold text-violet-200">{availableCount}</p>
                  <p className="mt-1 text-[9px] leading-4 text-zinc-500">All matching published {mode} questions are included automatically.</p>
                </div>
              )}
            </div>
            <div><h2 className="text-sm font-semibold">4. Session time</h2><div className="mt-4 grid grid-cols-3 gap-2">{[5, 10, 20].map((value) => <button key={value} onClick={() => setDuration(value)} className={`rounded-xl border py-3 text-xs font-medium ${duration === value ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200" : "border-white/[.07] text-zinc-600"}`}>{value}m</button>)}</div></div>
          </div>
          <div className="mt-7 grid gap-3 border-t border-white/[.06] pt-7 sm:grid-cols-3">
            {[
              ["Difficulty", difficulty, setDifficulty, ["Mixed", "Easy", "Medium", "Hard"]],
              ["Company", company, setCompany, ["Any company", ...hiringCompanies]],
              ["Experience", experience, setExperience, ["0–2 years", "3–5 years", "5+ years"]],
            ].map(([label, value, setter, options]) => (
              <label key={String(label)} className="text-[10px] text-zinc-600">{String(label)}
                <select value={String(value)} disabled={label === "Difficulty" && mode === "Adaptive"} onChange={(event) => (setter as (value: string) => void)(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/[.07] bg-[#101012] px-3 text-xs text-zinc-300 outline-none disabled:opacity-50">
                  {(options as string[]).map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            ))}
          </div>
        </Card>

        <Card className="h-fit overflow-hidden">
          <div className="border-b border-white/[.07] bg-gradient-to-br from-violet-500/10 to-cyan-500/[.03] p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-violet-400/10 text-violet-300">{mode === "Hands-on" ? <Code2 size={20} /> : <Gauge size={20} />}</span><div><p className="text-sm font-semibold">Session summary</p><p className="mt-1 text-[10px] text-zinc-600">{availableQuestions.length ? "Ready when you are" : "Content required"}</p></div></div></div>
          <div className="space-y-4 p-5">
            {[["Questions", String(mode === "Adaptive" ? Math.min(questionCount, availableCount) : availableCount)], ["Duration", mode === "Rapid Fire" ? "20 seconds each" : `${duration} minutes`], ["Mode", mode], ["Categories", selectedCategories.length ? `${selectedCategories.length} selected` : "All"], ["Difficulty", mode === "Adaptive" ? "Starts Medium" : difficulty], ["Company", company], ["Experience", experience]].map(([label, value]) => <div key={label} className="flex items-center justify-between text-xs"><span className="text-zinc-600">{label}</span><span className="text-zinc-300">{value}</span></div>)}
            <div className="rounded-xl border border-amber-400/10 bg-amber-400/[.045] p-3"><div className="flex items-start gap-2"><Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-300" /><p className="text-[10px] leading-5 text-zinc-500">{isAutomatic ? "Answers are scored automatically. Adaptive mode changes difficulty after every answer." : "Submit your response, compare it with the reference answer, and rate yourself honestly."}</p></div></div>
            <Button onClick={start} disabled={contentLoading || !availableQuestions.length} size="lg" className="w-full">Start {mode} <ChevronRight size={15} /></Button>
          </div>
        </Card>
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-white/[.06] p-5"><h2 className="text-sm font-semibold">Quiz attempt history</h2><p className="mt-1 text-[10px] text-zinc-600">Your latest completed sessions from Supabase.</p></div>
        {quizHistory.length ? quizHistory.slice(0, 10).map((attempt) => (
          <div key={attempt.id} className="grid gap-2 border-b border-white/[.05] p-4 last:border-0 sm:grid-cols-[1fr_100px_100px_150px] sm:items-center">
            <div><p className="text-xs">{attempt.mode}</p><p className="mt-1 text-[9px] text-zinc-600">{attempt.categories.join(", ") || "Mixed topics"}</p></div>
            <Badge tone={attempt.score / Math.max(1, attempt.total) >= .7 ? "green" : "amber"}>{attempt.score}/{attempt.total}</Badge>
            <span className="text-[10px] text-zinc-500">{Math.round(attempt.score / Math.max(1, attempt.total) * 100)}%</span>
            <span className="text-[9px] text-zinc-600">{new Date(attempt.createdAt).toLocaleString()}</span>
          </div>
        )) : <p className="p-8 text-center text-xs text-zinc-600">No attempts yet. Complete your first quiz to create history.</p>}
      </Card>
    </div>
  );
}
