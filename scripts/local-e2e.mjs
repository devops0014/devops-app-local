import { readFileSync } from "node:fs";

loadEnv(".env.local");

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:5173";
const supabaseUrl = trimSlash(process.env.NEXT_PUBLIC_SUPABASE_URL);
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.LOCAL_TEST_EMAIL;
const password = process.env.LOCAL_TEST_PASSWORD;

if (!supabaseUrl || !anonKey || !email || !password) {
  fail("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, LOCAL_TEST_EMAIL and LOCAL_TEST_PASSWORD in .env.local.");
}

console.log("DevOpsCrack local E2E");
await check("Application health", async () => {
  const response = await fetch(`${siteUrl}/api/health`);
  const body = await response.json();
  if (!response.ok || body.status !== "ok") throw new Error(body.message || `HTTP ${response.status}`);
});

let accessToken = "";
await check("Supabase password login", async () => {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) throw new Error(body.msg || body.error_description || `HTTP ${response.status}`);
  accessToken = body.access_token;
});

const authHeaders = { apikey: anonKey, Authorization: `Bearer ${accessToken}` };
let questions = [];
await check("Subscribed question-bank access", async () => {
  const response = await fetch(`${supabaseUrl}/rest/v1/questions?select=id,question_text,options,correct_option&is_published=eq.true&review_status=eq.approved&limit=10`, { headers: authHeaders });
  questions = await response.json();
  if (!response.ok) throw new Error(questions.message || `HTTP ${response.status}`);
  if (!questions.length) throw new Error("No published questions found. Run Supabase migrations and seed.sql.");
});

await check("MCQ content", async () => {
  const count = questions.filter((item) => Array.isArray(item.options) && item.options.length >= 2 && Number.isInteger(item.correct_option)).length;
  if (!count) throw new Error("No MCQ-ready questions found. Run migration 2026072903_end_to_end_learning.sql.");
});

await check("Account overview", async () => {
  const response = await fetch(`${siteUrl}/api/account/overview`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
});

if (process.env.RUN_AI_E2E === "1") {
  await check("Strict AI interview evaluation", async () => {
    const target = questions[0];
    const response = await fetch(`${siteUrl}/api/ai/mock-evaluate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        technology: "Mixed DevOps",
        company: "Test",
        level: "3–5 years",
        difficulty: "Mixed",
        timeSeconds: 10,
        answers: [{ questionId: target.id, answer: "Bananas are yellow and I like football." }],
      }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    if (body.evaluation.overallScore > 25) throw new Error(`Irrelevant answer scored ${body.evaluation.overallScore}; expected 25 or lower.`);
  });
} else {
  console.log("SKIP  Strict AI interview evaluation (set RUN_AI_E2E=1; consumes one mock credit)");
}

console.log("\nAll enabled local E2E checks passed.");

async function check(label, action) {
  try {
    await action();
    console.log(`PASS  ${label}`);
  } catch (error) {
    console.error(`FAIL  ${label}: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // The validation below reports missing values clearly.
  }
}

function trimSlash(value) {
  return value?.replace(/\/+$/, "");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
