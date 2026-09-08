import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("category selectors render the complete live catalog with the logo rail limited to Practice", async () => {
  const [practice, quiz, rail] = await Promise.all([
    readFile("app/(platform)/practice/page.tsx", "utf8"),
    readFile("app/(platform)/quiz/page.tsx", "utf8"),
    readFile("components/category-logo-rail.tsx", "utf8"),
  ]);
  assert.match(practice, /CategoryLogoRail categories=\{categories\}/);
  assert.doesNotMatch(quiz, /CategoryLogoRail/);
  assert.match(quiz, /categories\.map\(\(category\)/);
  assert.doesNotMatch(quiz, /categories\.slice\(0,\s*12\)/);
  assert.match(rail, /activeSlugs\.includes\(category\.slug\)/);
});

test("authenticated brand navigation remains in the workspace", async () => {
  const shell = await readFile("components/app-shell.tsx", "utf8");
  assert.match(shell, /Brand href="\/dashboard"/);
});

test("signup displays a clear email confirmation dialog", async () => {
  const login = await readFile("app/login/page.tsx", "utf8");
  assert.match(login, /setConfirmationEmail\(email\)/);
  assert.match(login, /confirmation link/i);
  assert.match(login, /Spam or Promotions/i);
});
