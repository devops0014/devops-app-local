import type { Difficulty, Question, QuizMode } from "@/lib/types";

const difficultyOrder: Difficulty[] = ["Easy", "Medium", "Hard"];

export function isValidMcq(question: Question) {
  return Boolean(
    Array.isArray(question.options)
      && question.options.length >= 2
      && Number.isInteger(question.correctOption)
      && Number(question.correctOption) >= 0
      && Number(question.correctOption) < question.options.length,
  );
}

export function matchesQuizMode(question: Question, mode: QuizMode) {
  if (["MCQ", "Rapid Fire", "Adaptive"].includes(mode)) return question.questionType === "mcq" && isValidMcq(question);
  if (mode === "Interview") return question.questionType === "general";
  if (mode === "Scenario") return question.questionType === "scenario";
  if (mode === "Hands-on") return question.questionType === "troubleshooting";
  return false;
}

export type QuizFilters = {
  categorySlugs: string[];
  difficulty: string;
  company: string;
};

function matchesFilters(question: Question, filters: QuizFilters) {
  const categoryMatch = !filters.categorySlugs.length || filters.categorySlugs.includes(question.categorySlug);
  const difficultyMatch = filters.difficulty === "Mixed" || question.difficulty === filters.difficulty;
  const companyMatch = filters.company === "Any company"
    || question.companies.some((company) => company.toLowerCase() === filters.company.toLowerCase());
  return categoryMatch && difficultyMatch && companyMatch;
}

export function getModeQuestions(questions: Question[], mode: QuizMode, filters: QuizFilters) {
  const filtered = questions.filter((question) => matchesFilters(question, filters));
  const preferred = filtered.filter((question) => matchesQuizMode(question, mode));

  return preferred;
}

function shuffled<T>(items: T[]) {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

/** Selects a varied session and round-robins chosen categories for fair coverage. */
export function selectBalancedQuestions(
  questions: Question[],
  count: number,
  selectedCategorySlugs: string[],
) {
  const unique = questions.filter((question, index, all) =>
    all.findIndex((item) => item.id === question.id) === index,
  );
  if (!selectedCategorySlugs.length) return shuffled(unique).slice(0, count);

  const buckets = selectedCategorySlugs
    .map((slug) => shuffled(unique.filter((question) => question.categorySlug === slug)))
    .filter((bucket) => bucket.length > 0);
  const selected: Question[] = [];
  let round = 0;
  while (selected.length < count && buckets.some((bucket) => round < bucket.length)) {
    for (const bucket of buckets) {
      if (selected.length >= count) break;
      if (bucket[round]) selected.push(bucket[round]);
    }
    round++;
  }
  return selected;
}

export function nextAdaptiveDifficulty(current: Difficulty, correct: boolean): Difficulty {
  const index = difficultyOrder.indexOf(current);
  const nextIndex = correct ? Math.min(index + 1, difficultyOrder.length - 1) : Math.max(index - 1, 0);
  return difficultyOrder[nextIndex];
}

export function pickAdaptiveQuestion(
  questions: Question[],
  difficulty: Difficulty,
  usedIds: string[],
) {
  const unused = questions.filter((question) => !usedIds.includes(question.id));
  return unused.find((question) => question.difficulty === difficulty) ?? unused[0];
}

export function calculateSelfRatedScore(ratings: Record<string, number>, questions: Question[]) {
  const totalRating = questions.reduce((sum, question) => sum + (ratings[question.id] ?? 0), 0);
  const mastered = questions.filter((question) => (ratings[question.id] ?? 0) >= 3).length;
  const accuracy = questions.length ? Math.round((totalRating / (questions.length * 5)) * 100) : 0;
  return { mastered, accuracy };
}
