import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("quiz shows right/wrong straight away and locks the first pick", () => {
  const quiz = read("app/(platform)/quiz/page.tsx");
  assert.match(quiz, /role="status"/);
  assert.match(quiz, /Not quite\. The answer is/);
  assert.match(quiz, /useReducedMotion/);
});

test("mastering the last question of a topic opens a celebration", () => {
  const practice = read("app/(platform)/practice/page.tsx");
  assert.match(practice, /<TopicCelebration/);
  assert.match(practice, /onTopicMastered\?\.\(\)/);
  const celebration = read("components/topic-celebration.tsx");
  assert.match(celebration, /You mastered/);
  assert.match(celebration, /prefers-reduced-motion/);
});

test("landing page shows product screens and a mentor card that hides until filled", () => {
  const landing = read("app/page.tsx");
  for (const screen of ["QuestionScreen", "QuizScreen", "FlashcardScreen"]) assert.match(landing, new RegExp(`function ${screen}`));
  assert.match(landing, /\{mentor\.name && <MentorCard \/>\}/);
  const config = read("lib/site-config.ts");
  assert.match(config, /mentor: \{\s*name: "",/);
});

test("lists load with skeletons, not spinners", () => {
  assert.match(read("components/ui.tsx"), /export function SkeletonRows/);
  for (const page of ["app/(platform)/leads/page.tsx", "app/(platform)/team/page.tsx", "components/notification-center.tsx"]) {
    assert.match(read(page), /<SkeletonRows/);
    assert.doesNotMatch(read(page), /LoaderCircle className="animate-spin/);
  }
  const flashcards = read("app/(platform)/flashcards/page.tsx");
  assert.match(flashcards, /Loading flashcards/);
  assert.doesNotMatch(flashcards, /\/ deck\.length\) \* 100\)%/);
});

test("student pages don't use tiny all-caps labels", () => {
  for (const page of ["app/(platform)/dashboard/page.tsx", "components/dashboard/account-overview.tsx", "app/(platform)/analytics/page.tsx", "components/app-shell.tsx"]) {
    assert.doesNotMatch(read(page), /className="[^"]*uppercase tracking/, page);
  }
});
