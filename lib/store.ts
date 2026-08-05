"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FlashcardReview, MockInterviewReport, ProgressStatus, QuizAttempt, UserQuestionState } from "./types";
import { saveFlashcardReview, saveMockReport, saveQuestionProgress, saveQuizAttempt, type CloudLearningState } from "./repositories/learning-repository";
import { awardGamificationEvent } from "./repositories/gamification-repository";
import { levelForXp } from "./gamification";

type AppState = {
  theme: "dark" | "light";
  commandOpen: boolean;
  progress: Record<string, UserQuestionState>;
  xp: number;
  level: number;
  levelName: string;
  streak: number;
  bestStreak: number;
  latestUnlocks: string[];
  quizAttempts: QuizAttempt[];
  flashcardReviews: Record<string, FlashcardReview>;
  mockReports: MockInterviewReport[];
  cloudStatus: "demo" | "connecting" | "synced" | "offline";
  setTheme: (theme: "dark" | "light") => void;
  setCommandOpen: (open: boolean) => void;
  updateQuestion: (id: string, patch: Partial<UserQuestionState>) => void;
  addXp: (amount: number, eventKey?: string) => void;
  recordQuizAttempt: (attempt: QuizAttempt) => void;
  recordFlashcardReview: (questionId: string, known: boolean) => void;
  recordMockReport: (report: MockInterviewReport) => void;
  hydrateCloudState: (state: CloudLearningState) => void;
  setCloudStatus: (status: AppState["cloudStatus"]) => void;
  clearUnlocks: () => void;
};

const defaultQuestionState: UserQuestionState = {
  status: "Not Started",
  confidence: 3,
  bookmarked: false,
  note: "",
};

export const useAppStore = create<AppState>()(persist((set) => ({
  theme: "dark",
  commandOpen: false,
  progress: {},
  xp: 0,
  level: 1,
  levelName: "DevOps Novice",
  streak: 0,
  bestStreak: 0,
  latestUnlocks: [],
  quizAttempts: [],
  flashcardReviews: {},
  mockReports: [],
  cloudStatus: "connecting",
  setTheme: (theme) => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", theme === "light");
    }
    set({ theme });
  },
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  updateQuestion: (id, patch) =>
    set((state) => {
      const next = { ...(state.progress[id] ?? defaultQuestionState), ...patch, ...("note" in patch && Object.keys(patch).length === 1 ? {} : { lastAttemptAt: new Date().toISOString() }) };
      scheduleProgressSave(id, next, Object.keys(patch).length === 1 && "note" in patch);
      return {
      progress: {
        ...state.progress,
        [id]: next,
      },
      };
    }),
  addXp: (amount, eventKey) => {
    void awardGamificationEvent(amount < 0 ? "question_unmastered" : "question_mastered", eventKey ?? `local-${Date.now()}`)
      .then((snapshot) => snapshot && set({
        xp: snapshot.xp, level: snapshot.level, levelName: snapshot.levelName,
        streak: snapshot.streak, bestStreak: snapshot.bestStreak,
        latestUnlocks: snapshot.unlockedBadges,
      }));
  },
  recordQuizAttempt: (attempt) => set((state) => {
    void saveQuizAttempt(attempt);
    void awardGamificationEvent("quiz_completed", attempt.id, {
      score: Math.round((attempt.score / Math.max(attempt.total, 1)) * 100),
      correct: attempt.score,
      incorrect: Math.max(0, attempt.total - attempt.score),
      total: attempt.total,
      mode: attempt.mode,
    }).then((snapshot) => snapshot && set({
      xp: snapshot.xp, level: snapshot.level, levelName: snapshot.levelName,
      streak: snapshot.streak, bestStreak: snapshot.bestStreak,
      latestUnlocks: snapshot.unlockedBadges,
    }));
    return {
      quizAttempts: [attempt, ...state.quizAttempts].slice(0, 30),
    };
  }),
  recordFlashcardReview: (questionId, known) => set((state) => {
    const previous = state.flashcardReviews[questionId];
    const intervalDays = known ? Math.min(previous ? Math.max(previous.intervalDays * 2, 2) : 2, 30) : 1;
    void saveFlashcardReview(questionId, known, intervalDays);
    void awardGamificationEvent(known ? "flashcard_known" : "flashcard_revision", `${questionId}:${(previous?.reviewCount ?? 0) + 1}`, {
      questionId,
    }).then((snapshot) => snapshot && set({
      xp: snapshot.xp, level: snapshot.level, levelName: snapshot.levelName,
      streak: snapshot.streak, bestStreak: snapshot.bestStreak,
      latestUnlocks: snapshot.unlockedBadges,
    }));
    const reviewedAt = new Date();
    const nextReviewAt = new Date(reviewedAt.getTime() + intervalDays * 86_400_000);
    return {
      flashcardReviews: {
        ...state.flashcardReviews,
        [questionId]: {
          questionId,
          known,
          intervalDays,
          reviewedAt: reviewedAt.toISOString(),
          nextReviewAt: nextReviewAt.toISOString(),
          reviewCount: (previous?.reviewCount ?? 0) + 1,
        },
      },
      progress: {
        ...state.progress,
        [questionId]: {
          ...(state.progress[questionId] ?? defaultQuestionState),
          status: known ? "Seen" : "Need Revision",
          confidence: known ? Math.min((state.progress[questionId]?.confidence ?? 3) + 1, 5) : 2,
        },
      },
    };
  }),
  recordMockReport: (report) => set((state) => {
    void saveMockReport(report);
    void awardGamificationEvent("mock_completed", report.id, {
      score: report.score,
      technology: report.technology,
    }).then((snapshot) => snapshot && set({
      xp: snapshot.xp, level: snapshot.level, levelName: snapshot.levelName,
      streak: snapshot.streak, bestStreak: snapshot.bestStreak,
      latestUnlocks: snapshot.unlockedBadges,
    }));
    return {
      mockReports: [report, ...state.mockReports].slice(0, 20),
    };
  }),
  hydrateCloudState: (cloud) => set((state) => {
    const level = levelForXp(cloud.xp);
    return {
    progress: cloud.progress,
    quizAttempts: cloud.quizAttempts,
    mockReports: cloud.mockReports,
    xp: cloud.xp,
    level: level.level,
    levelName: level.name,
    streak: cloud.streak,
    bestStreak: cloud.bestStreak,
    };
  }),
  setCloudStatus: (cloudStatus) => set({ cloudStatus }),
  clearUnlocks: () => set({ latestUnlocks: [] }),
}), {
  name: "devopscrack-progress-v2",
  partialize: (state) => ({
    progress: state.progress,
    xp: state.xp,
    level: state.level,
    levelName: state.levelName,
    streak: state.streak,
    bestStreak: state.bestStreak,
    quizAttempts: state.quizAttempts,
    flashcardReviews: state.flashcardReviews,
    mockReports: state.mockReports,
  }),
}));

const progressSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
function scheduleProgressSave(id: string, state: UserQuestionState, debounce: boolean) {
  const existing = progressSaveTimers.get(id);
  if (existing) clearTimeout(existing);
  if (!debounce) {
    void saveQuestionProgress(id, state);
    return;
  }
  progressSaveTimers.set(id, setTimeout(() => {
    progressSaveTimers.delete(id);
    void saveQuestionProgress(id, state);
  }, 650));
}

export function questionState(
  progress: Record<string, UserQuestionState>,
  id: string,
): UserQuestionState {
  return progress[id] ?? defaultQuestionState;
}

export const statusOptions: ProgressStatus[] = [
  "Not Started",
  "Seen",
  "Mastered",
  "Need Revision",
];
