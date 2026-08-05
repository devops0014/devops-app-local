export type Difficulty = "Easy" | "Medium" | "Hard";
export type ProgressStatus = "Not Started" | "Seen" | "Mastered" | "Need Revision";

export type Question = {
  id: string;
  databaseId?: string;
  category: string;
  categorySlug: string;
  question: string;
  answer: string;
  difficulty: Difficulty;
  tags: string[];
  companies: string[];
  bookmarks: number;
  options?: string[];
  correctOption?: number;
  questionType?: "mcq" | "general" | "scenario" | "troubleshooting" | "behavioral";
  hints?: string[];
  expectedKeywords?: string[];
};

export type UserQuestionState = {
  status: ProgressStatus;
  confidence: number;
  bookmarked: boolean;
  note: string;
  lastAttemptAt?: string;
};

export type QuizMode = "MCQ" | "Interview" | "Scenario" | "Rapid Fire" | "Hands-on" | "Adaptive";

export type QuizAttempt = {
  id: string;
  mode: QuizMode;
  score: number;
  total: number;
  timeSeconds: number;
  categories: string[];
  weakCategories: string[];
  createdAt: string;
};

export type FlashcardReview = {
  questionId: string;
  known: boolean;
  intervalDays: number;
  reviewedAt: string;
  nextReviewAt: string;
  reviewCount: number;
};

export type MockInterviewReport = {
  id: string;
  technology: string;
  company: string;
  level: string;
  score: number;
  timeSeconds: number;
  answered: number;
  createdAt: string;
};
