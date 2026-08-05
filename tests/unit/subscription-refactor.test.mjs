import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("subscription catalog uses approved Razorpay prices and entitlements", async () => {
  const source = await readFile(new URL("../../lib/payments.ts", import.meta.url), "utf8");
  for (const fragment of ["amountInr: 199", "amountInr: 799", "amountInr: 999", "mockInterviewLimit: 2", "mockInterviewLimit: 15", "resumeReviewLimit: 5"]) {
    assert.match(source, new RegExp(fragment));
  }
  assert.doesNotMatch(source, /PaymentProvider|checkoutUrl/);
});

test("device and AI governance schema is present", async () => {
  const migration = await readFile(new URL("../../supabase/migrations/2026072704_production_refactor.sql", import.meta.url), "utf8");
  for (const table of ["user_sessions", "user_ai_usage", "ai_response_cache", "security_notifications"]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
  }
  assert.match(migration, /consume_ai_credit/);
});
