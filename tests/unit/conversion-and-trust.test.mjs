import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("public pages carry no invented stats, ratings or testimonials", () => {
  const pages = ["app/page.tsx", "app/login/page.tsx"].map(read).join("\n");
  for (const claim of [/95%/, /4\.9\/5/, /10,000\+/, /1,857/, /89%/, /Anjali Kumar/, /Success rate/i]) {
    assert.doesNotMatch(pages, claim);
  }
  const leaderboard = read("app/(platform)/leaderboard/page.tsx");
  assert.doesNotMatch(leaderboard, /fallbackLeaders/);
  assert.equal(existsSync(new URL("../../lib/data.ts", import.meta.url)), false);
  assert.doesNotMatch(read("components/charts.tsx"), /W1", accuracy: 48/);
});

test("privacy policy, terms and consent withdrawal exist and are linked", () => {
  assert.ok(existsSync(new URL("../../app/privacy/page.tsx", import.meta.url)));
  assert.ok(existsSync(new URL("../../app/terms/page.tsx", import.meta.url)));
  const landing = read("app/page.tsx");
  assert.match(landing, /href="\/privacy"/);
  assert.match(read("app/login/page.tsx"), /href="\/terms"/);
  assert.match(read("components/account-menu.tsx"), /\/api\/me\/consent/);
  assert.match(read("app/api/webhooks/whatsapp/route.ts"), /isStopMessage/);
  assert.match(read("app/api/me/consent/route.ts"), /do_not_contact: !body\.consent/);
});

test("landing page sends visitors to sign-up and lets them try a question", () => {
  const landing = read("app/page.tsx");
  assert.match(landing, /const SIGNUP = "\/login\?mode=signup"/);
  assert.match(landing, /function TryQuestion/);
  assert.match(read("app/login/page.tsx"), /get\("mode"\) === "signup"/);
});

test("lead source is captured at sign-up and locked against student edits", () => {
  assert.match(read("app/login/page.tsx"), /attributionForSignup\(\)/);
  assert.match(read("lib/attribution.ts"), /fbclid/);
  const sql = read("supabase/migrations/2026101301_sales_tools.sql");
  assert.match(sql, /new\.utm_source is distinct from old\.utm_source/);
  assert.match(sql, /meta->>'utm_source'/);
  assert.match(sql, /'no_answer'.*'enrolled'/s);
  assert.doesNotMatch(sql, /\bcurrent_role\b/);
});

test("sales tools: follow-ups, owners, hot leads and callbacks are wired end to end", () => {
  const api = read("app/api/leads/route.ts");
  assert.match(api, /"followups"/);
  assert.match(api, /"callbacks"/);
  assert.match(api, /owner === "me"/);
  assert.match(api, /sort === "hot"/);
  const patch = read("app/api/leads/[id]/route.ts");
  assert.match(patch, /follow_up_at/);
  assert.match(patch, /\["sales", "super_admin"\]\.includes\(owner\.role\)/);
  assert.match(read("app/api/me/callback/route.ts"), /callback_requested_at/);
  assert.match(read("app/(platform)/dashboard/page.tsx"), /<CourseCallout/);
  assert.match(read("app/(platform)/quiz/page.tsx"), /<CourseCallout/);
});

test("Meta Pixel and Conversions API share one event id for verified sign-ups", () => {
  const capi = read("lib/meta-capi.ts");
  assert.match(capi, /verified-\$\{userId\}/);
  assert.match(capi, /sha256/);
  assert.match(read("app/verify-phone/page.tsx"), /`verified-\$\{data\.user\.id\}`/);
  assert.match(read("lib/phone-verification.ts"), /sendMetaEvent/);
});

test("mobile bottom bar shows quiz and flashcards to students and leads to the team", () => {
  const shell = read("components/app-shell.tsx");
  assert.match(shell, /studentMobileItems[\s\S]*"\/quiz"[\s\S]*"\/flashcards"/);
  assert.match(shell, /salesMobileItems[\s\S]*"\/leads"/);
});

test("home page opens with the tool picker, keeps the sample quiz, and has no FAQ", () => {
  const landing = read("app/page.tsx");
  assert.match(landing, /function ToolPicker/);
  assert.match(landing, /What&rsquo;s your interview on\?/);
  assert.match(landing, /rememberInterestTopic\(slug\)/);
  assert.match(landing, /<TrySection \/>/);
  assert.doesNotMatch(landing, /function Faq|faqs|href="#faq"/);
  for (const match of landing.matchAll(/icon: "([a-z]+)"/g)) {
    assert.ok(existsSync(new URL(`../../public/category-icons/${match[1]}.svg`, import.meta.url)), `missing icon ${match[1]}`);
  }
  assert.match(read("app/welcome/page.tsx"), /\/practice\?category=/);
  assert.match(read("supabase/migrations/2026101302_interest_topic.sql"), /interest_topic/);
});
