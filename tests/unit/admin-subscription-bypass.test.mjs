import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("administrators bypass the student subscription gate", async () => {
  const source = await readFile("components/access-gate.tsx", "utf8");
  assert.match(source, /select\("role, subscription_status, subscription_expires_at"\)/);
  assert.match(source, /if \(profile\?\.role === "admin"\)/);
  assert.ok(
    source.indexOf('profile?.role === "admin"') < source.indexOf("const subscribed"),
    "admin bypass must execute before subscription validation",
  );
});
