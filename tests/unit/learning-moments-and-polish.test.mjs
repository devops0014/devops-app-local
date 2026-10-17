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

test("streak flame grows with the streak", () => {
  // Read the source (CI's Node 22.13 can't import .ts files directly).
  const source = read("lib/streak.ts");
  const levels = [...source.matchAll(/level: (\d), size: (\d+), glow: (\d+)/g)].map((match) => match.slice(1).map(Number));
  assert.deepEqual(levels.map(([level]) => level), [0, 1, 2, 3, 4]);
  for (let index = 1; index < levels.length; index += 1) {
    assert.ok(levels[index][1] > levels[index - 1][1], "flame gets bigger");
    assert.ok(levels[index][2] > levels[index - 1][2], "glow gets stronger");
  }
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

test("root layout leaves <head> to the framework so page scripts load", () => {
  assert.doesNotMatch(read("app/layout.tsx"), /<head>/);
  assert.match(read("app/globals.css"), /^@import url\("https:\/\/fonts\.googleapis\.com/);
});

test("forms post, so a password can never end up in the address bar", () => {
  for (const page of ["app/login/page.tsx", "app/reset-password/page.tsx", "app/change-password/page.tsx", "components/account-menu.tsx"]) {
    assert.doesNotMatch(read(page), /<form (?![^>]*method="post")/, page);
  }
});

test("hero tool picker is a 3D keycap board with keyboard shortcuts", () => {
  const landing = read("app/page.tsx");
  assert.match(landing, /className="kc-stage"/);
  assert.match(landing, /aria-keyshortcuts=\{item\.key\}/);
  assert.match(landing, /tool\.key === event\.key\.toUpperCase\(\)/);
  assert.match(landing, /if \(reduced\) return \(\) => observer\.disconnect\(\);/);
  const keys = [...landing.matchAll(/key: "([A-Z])" \}/g)].map((match) => match[1]);
  assert.equal(keys.length, 12);
  assert.equal(new Set(keys).size, 12, "every tool needs its own shortcut letter");
  const css = read("app/globals.css");
  assert.match(css, /\.kc-board \{[\s\S]*transform-style: preserve-3d/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.kc-top/);
});
