import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("student learning modes use the Supabase content catalog", () => {
  for (const page of ["practice", "quiz", "flashcards"]) {
    const source = read(`app/(platform)/${page}/page.tsx`);
    assert.match(source, /useContentCatalog/);
    assert.doesNotMatch(source, /from ["']@\/lib\/data["']/);
  }
});

test("platform is free: no payment gateway, paywall or AI mock interview", () => {
  for (const path of [
    "app/pricing/page.tsx",
    "app/(platform)/billing/page.tsx",
    "app/(platform)/mock-interview/page.tsx",
    "app/api/payments/create-checkout/route.ts",
    "app/api/webhooks/razorpay/route.ts",
    "app/api/ai/mock-evaluate/route.ts",
    "lib/payments.ts",
  ]) {
    assert.equal(existsSync(new URL(`../../${path}`, import.meta.url)), false, `${path} should be removed`);
  }
  const gate = read("components/access-gate.tsx");
  const layout = read("app/(platform)/layout.tsx");
  const shell = read("components/app-shell.tsx");
  assert.match(layout, /AuthGate/);
  assert.doesNotMatch(gate, /subscription|\/pricing/i);
  assert.doesNotMatch(shell, /\/billing|\/mock-interview/);
  const migration = read("supabase/migrations/2026101201_free_access.sql");
  assert.match(migration, /questions_read_published/);
  assert.doesNotMatch(migration.split("OPTIONAL CLEANUP")[0], /subscription_status in/);
});

test("admin question management supports MCQ options", () => {
  const api = read("app/api/admin/questions/route.ts");
  const editor = read("components/admin/question-manager.tsx");
  assert.match(api, /validateOptions/);
  assert.match(editor, /MCQ options/);
  assert.match(editor, /correct_option/);
});

test("end-to-end migration seeds MCQ content and roadmap read policies", () => {
  const sql = read("supabase/migrations/2026072903_end_to_end_learning.sql");
  assert.match(sql, /correct_option/);
  assert.match(sql, /learning_paths_read_published/);
  assert.match(sql, /topics_read_authenticated/);
});

test("quiz supports large balanced multi-category sessions", () => {
  const page = read("app/(platform)/quiz/page.tsx");
  const engine = read("lib/quiz/engine.ts");
  assert.match(page, /\[5, 10, 20, 50, 100\]/);
  assert.match(page, /selectBalancedQuestions/);
  assert.match(engine, /round-robins chosen categories/);
});

test("admin separates question banks and opens the real question manager", () => {
  const manager = read("components/admin/question-manager.tsx");
  const admin = read("app/(platform)/admin/page.tsx");
  assert.match(manager, /All questions/);
  assert.match(manager, /General questions/);
  assert.match(admin, /openQuestionManager/);
  assert.match(admin, /scrollIntoView/);
});

test("dashboard advances after a completed category and GitHub is importable", () => {
  const dashboard = read("app/(platform)/dashboard/page.tsx");
  const migration = read("supabase/migrations/2026073105_quiz_admin_categories.sql");
  assert.match(dashboard, /nextCategory/);
  assert.match(dashboard, /status !== "Mastered"/);
  assert.match(migration, /'GitHub', 'github'/);
});
