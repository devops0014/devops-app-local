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

test("default phone step is a simple confirmation with no WhatsApp setup", () => {
  const lib = read("lib/phone-verification.ts");
  assert.match(lib, /return value === "otp" \|\| value === "inbound" \? value : "none"/);
  assert.match(lib, /isBlockedPhone\(phoneE164\)/);
  assert.match(lib, /phone_verification_method: method/);
  const confirm = read("app/api/phone/confirm/route.ts");
  assert.match(confirm, /consent/);
  assert.match(confirm, /"none"\)/);
  assert.match(read("app/verify-phone/page.tsx"), /function ConfirmFlow/);
  assert.match(read(".env.example"), /PHONE_VERIFY_METHOD=none/);
  assert.match(read("lib/leads-server.ts"), /\["whatsapp", "otp"\]\.includes/);
});

test("wrong-number blocking deletes the account, keeps a blocked record and tells the student", () => {
  const block = read("app/api/leads/[id]/block/route.ts");
  assert.match(block, /requirePermission\(request, "leads\.block"\)/);
  assert.match(block, /blocked_contacts/);
  assert.match(block, /auth\.admin\.deleteUser\(id\)/);
  assert.match(block, /student\.role !== "student"/);
  assert.match(read("lib/rbac.ts"), /sales: \["leads\.view", "leads\.update", "leads\.block"\]/);
  const blocked = read("app/api/leads/blocked/route.ts");
  assert.match(blocked, /requirePermission\(request, "team\.manage"\)[\s\S]*requirePermission\(request, "team\.manage"\)/);
  const notice = read("app/api/auth/blocked-notice/route.ts");
  assert.match(notice, /Already signed up again/);
  assert.match(read("app/login/page.tsx"), /\/api\/auth\/blocked-notice/);
  const sql = read("supabase/migrations/2026101601_phone_confirm_and_blocking.sql");
  assert.match(sql, /create table if not exists public\.blocked_contacts/);
  assert.match(sql, /enable row level security/);
});

test("caller templates fill placeholders and offer WhatsApp, email and copy", () => {
  const templates = read("lib/message-templates.ts");
  for (const id of ["call-script", "first-contact", "no-answer", "course-details", "follow-up", "course-email"]) {
    assert.match(templates, new RegExp(`id: "${id}"`));
  }
  assert.match(templates, /blockedNoticeTemplate/);
  assert.match(templates, /create a new account at \{siteUrl\} using your own, correct mobile number/);
  const tools = read("components/leads/caller-tools.tsx");
  assert.match(tools, /whatsappLink\(lead\.mobile, body\)/);
  assert.match(tools, /mailtoLink\(/);
  assert.match(read("app/(platform)/leads/page.tsx"), /<QuickMessages/);
});

test("new students get a Start here screen instead of a dashboard of zeros", () => {
  const dashboard = read("app/(platform)/dashboard/page.tsx");
  assert.match(dashboard, /isNewStudent && cloudStatus === "connecting"/);
  assert.match(dashboard, /<StartHere /);
  assert.doesNotMatch(dashboard, /18 questions away/);
  assert.doesNotMatch(dashboard, /\[1, 1, 1, 1, 1, 1, 0\]/);
  assert.doesNotMatch(dashboard, /Hard · 12 min/);
  const start = read("components/dashboard/start-here.tsx");
  assert.match(start, /interestTopic\(\)/);
  assert.match(start, /\/practice\?category=/);
});

test("brand fonts are actually loaded and applied", () => {
  const css = read("app/globals.css");
  assert.match(css, /fonts\.googleapis\.com\/css2\?family=Bricolage\+Grotesque/);
  assert.match(css, /--font-sans: "Figtree"/);
  assert.match(css, /@layer base \{\s*h1, h2 \{\s*font-family: "Bricolage Grotesque"/);
  assert.doesNotMatch(css, /"Inter"/);
});
