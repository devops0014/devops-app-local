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

test("landing page shows product screens and no mentor card", () => {
  const landing = read("app/page.tsx");
  for (const screen of ["QuestionScreen", "QuizScreen", "FlashcardScreen"]) assert.match(landing, new RegExp(`function ${screen}`));
  assert.doesNotMatch(landing, /MentorCard|Who&rsquo;s behind this/);
  assert.doesNotMatch(read("lib/site-config.ts"), /mentor:/);
});

test("streak flame grows with the streak", async () => {
  const { flameLevel } = await import("../../lib/streak.ts");
  const sizes = [0, 1, 3, 7, 14, 60].map((days) => flameLevel(days));
  assert.equal(sizes[0].level, 0);
  assert.equal(sizes.at(-1).level, 4);
  for (let index = 1; index < sizes.length; index += 1) assert.ok(sizes[index].size >= sizes[index - 1].size);
  assert.match(read("app/(platform)/dashboard/page.tsx"), /flameLevel\(streak\)/);
});

test("lists load with skeletons, not spinners", () => {
  assert.match(read("components/ui.tsx"), /export function SkeletonRows/);
  for (const page of ["app/(platform)/leads/page.tsx", "app/(platform)/team/page.tsx", "components/notification-center.tsx", "components/admin/question-manager.tsx", "components/admin/ai-content-engine.tsx", "components/admin/platform-manager.tsx"]) {
    assert.match(read(page), /<SkeletonRows/);
    assert.doesNotMatch(read(page), /LoaderCircle className="animate-spin/);
  }
  const flashcards = read("app/(platform)/flashcards/page.tsx");
  assert.match(flashcards, /Loading flashcards/);
  assert.doesNotMatch(flashcards, /\/ deck\.length\) \* 100\)%/);
});

test("no tiny all-caps labels outside the flashcard swipe stamps", () => {
  for (const page of ["app/(platform)/dashboard/page.tsx", "components/dashboard/account-overview.tsx", "app/(platform)/analytics/page.tsx", "components/app-shell.tsx", "app/(platform)/practice/page.tsx", "components/admin/question-manager.tsx", "components/admin/ai-content-engine.tsx"]) {
    assert.doesNotMatch(read(page), /\buppercase\b/, page);
  }
  assert.doesNotMatch(read("components/access-gate.tsx"), /animate-spin/);
});
