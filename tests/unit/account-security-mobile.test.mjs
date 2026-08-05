import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("sign-out clears the local session and performs a hard redirect home", async () => {
  const source = await readFile("components/app-shell.tsx", "utf8");
  assert.match(source, /signOut\(\{ scope: "local" \}\)/);
  assert.match(source, /window\.location\.replace\("\/"\)/);
  assert.match(source, /GoodbyeMoment open=\{goodbyeOpen\} onClose=/);
});

test("account password changes verify the old password and sign out afterward", async () => {
  const menu = await readFile("components/account-menu.tsx", "utf8");
  const source = await readFile("app/change-password/page.tsx", "utf8");
  assert.match(menu, /href="\/change-password"/);
  assert.match(source, /currentPassword/);
  assert.match(source, /signInWithPassword/);
  assert.match(source, /updateUser\(\{ password: newPassword \}\)/);
  assert.match(source, /signOut\(\{ scope: "local" \}\)/);
  assert.match(source, /window\.location\.replace\("\/login"\)/);
});

test("mobile dashboard exposes XP near the top", async () => {
  const source = await readFile("app/(platform)/dashboard/page.tsx", "utf8");
  assert.match(source, /aria-label="Experience points"/);
  assert.match(source, /lg:hidden/);
  assert.match(source, /\{xp\.toLocaleString\(\)\}/);
});
