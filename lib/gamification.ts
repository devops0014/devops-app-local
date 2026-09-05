export type GamificationEventType =
  | "question_mastered"
  | "question_unmastered"
  | "flashcard_known"
  | "flashcard_revision"
  | "quiz_completed"
  | "mock_completed"
  | "daily_goal";

export type GamificationSnapshot = {
  xp: number;
  level: number;
  levelName: string;
  streak: number;
  bestStreak: number;
  unlockedBadges: string[];
};

export const levelCatalog = [
  { level: 1, minXp: 0, name: "DevOps Novice" },
  { level: 2, minXp: 500, name: "Linux Explorer" },
  { level: 3, minXp: 1_250, name: "Pipeline Builder" },
  { level: 4, minXp: 2_500, name: "Container Engineer" },
  { level: 5, minXp: 4_500, name: "Kubernetes Pro" },
  { level: 6, minXp: 7_500, name: "Platform Engineer" },
  { level: 7, minXp: 11_000, name: "Cloud Architect" },
  { level: 8, minXp: 16_000, name: "DevOps Guru" },
] as const;

export function levelForXp(xp: number) {
  return [...levelCatalog].reverse().find((item) => xp >= item.minXp) ?? levelCatalog[0];
}

export function nextLevelForXp(xp: number) {
  const current = levelForXp(xp);
  return levelCatalog.find((item) => item.level === current.level + 1) ?? current;
}

export function levelProgress(xp: number) {
  const current = levelForXp(xp);
  const next = nextLevelForXp(xp);
  if (current.level === next.level) return 100;
  return Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100);
}

export const xpRules = {
  practiceMastered: 20,
  practiceUnmastered: -20,
  flashcardKnown: 20,
  flashcardRevision: 0,
  quizCorrect: 40,
  quizIncorrect: -10,
  mockExcellent: 100,
  mockGood: 60,
  mockDeveloping: 30,
  mockNeedsWork: -25,
} as const;

export function quizXp(correct: number, total: number) {
  const safeCorrect = Math.max(0, Math.min(total, correct));
  return safeCorrect * xpRules.quizCorrect
    + Math.max(0, total - safeCorrect) * xpRules.quizIncorrect;
}

export function mockXp(score: number) {
  if (score >= 80) return xpRules.mockExcellent;
  if (score >= 60) return xpRules.mockGood;
  if (score >= 40) return xpRules.mockDeveloping;
  return xpRules.mockNeedsWork;
}
