import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("role matrix keeps leads, content and team permissions separate", () => {
  const rbac = read("lib/rbac.ts");
  assert.match(rbac, /sales: \["leads\.view", "leads\.update", "leads\.block"\]/);
  assert.match(rbac, /admin: \["content\.manage"\]/);
  assert.match(rbac, /super_admin: \[[^\]]*"team\.manage"/);
  assert.match(rbac, /student: \[\]/);
});

test("every leads and team API route enforces a permission on the server", () => {
  for (const [route, permission] of [
    ["app/api/leads/route.ts", /leads\.(view|export)/],
    ["app/api/leads/[id]/route.ts", /leads\.update/],
    ["app/api/leads/[id]/activity/route.ts", /leads\.view[\s\S]*leads\.update/],
    ["app/api/team/route.ts", /team\.manage[\s\S]*team\.manage/],
  ]) {
    const source = read(route);
    assert.match(source, /requirePermission/, route);
    assert.match(source, permission, route);
  }
});

test("students cannot promote themselves or fake phone verification", () => {
  const sql = read("supabase/migrations/2026101202_leads_rbac.sql");
  assert.match(sql, /protect_profile_columns/);
  assert.match(sql, /new\.role is distinct from old\.role/);
  assert.match(sql, /new\.phone_verified_at is distinct from old\.phone_verified_at/);
  assert.match(sql, /alter table public\.leads enable row level security/);
  assert.match(sql, /alter table public\.lead_activity enable row level security/);
  assert.match(sql, /alter table public\.phone_otps enable row level security/);
});

test("WhatsApp OTP is hashed, expires, is attempt-limited and requires consent", () => {
  const send = read("app/api/phone/send-otp/route.ts");
  const verify = read("app/api/phone/verify-otp/route.ts");
  const lib = read("lib/whatsapp.ts");
  assert.match(send, /consent/);
  assert.match(send, /hashOtp/);
  assert.match(send, /OTP_RESEND_SECONDS/);
  assert.doesNotMatch(send, /code_hash: code/);
  assert.match(verify, /OTP_MAX_ATTEMPTS/);
  assert.match(verify, /expires_at/);
  assert.match(lib, /timingSafeEqual/);
  assert.match(lib, /sub_type: "url"/);
});

test("students must verify WhatsApp before using the platform; staff skip it", () => {
  const gate = read("components/access-gate.tsx");
  assert.match(gate, /\/verify-phone/);
  assert.match(gate, /isStaff/);
});

test("leads use India Standard Time for daily boundaries", () => {
  const source = read("lib/leads.ts");
  assert.match(source, /IST_OFFSET = "\+05:30"/);
  assert.match(source, /330 \* 60_000/);
  assert.equal(new Date("2026-10-12T00:00:00+05:30").toISOString(), "2026-10-11T18:30:00.000Z");
});

test("free inbound WhatsApp verification: signed webhook, expiring codes, default method", () => {
  const webhook = read("app/api/webhooks/whatsapp/route.ts");
  const lib = read("lib/phone-verification.ts");
  const start = read("app/api/phone/start/route.ts");
  const dev = read("app/api/phone/dev-verify/route.ts");
  assert.match(webhook, /verifyWebhookSignature\(raw, request\.headers\.get\("x-hub-signature-256"\)\)/);
  assert.match(webhook, /hub\.verify_token/);
  assert.match(lib, /value === "otp" \|\| value === "inbound" \? value : "none"/);
  assert.match(lib, /expires_at/);
  assert.match(lib, /already linked to another account/);
  assert.match(start, /consent/);
  assert.match(dev, /if \(!inboundDevMode\(\)\) throw new ApiError\("Not available\.", 404\)/);
  const sql = read("supabase/migrations/2026101203_whatsapp_inbound_verify.sql");
  assert.match(sql, /token text not null unique/);
  assert.match(sql, /enable row level security/);
});

test("verify code parser accepts the pre-filled message and rejects junk", () => {
  const source = read("lib/phone-verification.ts");
  const pattern = new RegExp(source.match(/text\.toUpperCase\(\)\.match\(\/(.+?)\/\)/)[1]);
  const extract = (text) => { const match = text.toUpperCase().match(pattern); return match ? `DC-${match[1]}` : null; };
  assert.equal(extract("VERIFY DC-7K3P9QXM"), "DC-7K3P9QXM");
  assert.equal(extract("verify dc-7k3p9qxm"), "DC-7K3P9QXM");
  assert.equal(extract("hello"), null);
  assert.equal(extract("DC-7K3P9QXMZZ"), null);
});
