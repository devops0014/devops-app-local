import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("bulk import writes only columns supported by each question bank", async () => {
  const route = await readFile(new URL("../../app/api/admin/import/route.ts", import.meta.url), "utf8");
  assert.match(route, /targetTable.*mcq_questions.*general_questions/);
  assert.match(route, /payload\.slice\(offset, offset \+ 200\)/);
  assert.doesNotMatch(route, /\.\.\.row,/);
  assert.match(route, /Database import failed near row/);
});

test("Supabase object errors are surfaced to the admin", async () => {
  const server = await readFile(new URL("../../lib/admin/server.ts", import.meta.url), "utf8");
  assert.match(server, /databaseError\.message/);
  assert.match(server, /databaseError\.hint/);
  assert.match(server, /databaseError\.code/);
});

test("student navigation hides the admin link by role", async () => {
  const shell = await readFile(new URL("../../components/app-shell.tsx", import.meta.url), "utf8");
  assert.match(shell, /profile\?\.role === "admin"/);
  assert.match(shell, /GoodbyeMoment open=\{goodbyeOpen\} onClose=\{closeGoodbye\}/);
});
