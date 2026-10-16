#!/usr/bin/env node
/**
 * Creates (or upgrades) a staff account in your Supabase project.
 *
 *   npm run create-admin -- --email you@example.com
 *   npm run create-admin -- --email you@example.com --password 'MyStrongPass123' --name "Your Name"
 *   npm run create-admin -- --email caller@example.com --role sales
 *
 * Roles: super_admin (default), admin, sales.
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local,
 * and migration 2026101202_leads_rbac.sql applied.
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, all) => {
    if (value.startsWith("--")) pairs.push([value.slice(2), all[index + 1]?.startsWith("--") ? "true" : all[index + 1]]);
    return pairs;
  }, []),
);

const email = String(args.email ?? "").trim().toLowerCase();
const role = String(args.role ?? "super_admin");
const name = args.name ? String(args.name) : "Super Admin";
const generated = !args.password;
const password = generated ? `${randomBytes(9).toString("base64url")}A1!` : String(args.password);

const fail = (message) => { console.error(`\n✖ ${message}\n`); process.exit(1); };

if (!/^\S+@\S+\.\S+$/.test(email)) fail("Pass your email: npm run create-admin -- --email you@example.com");
if (!["super_admin", "admin", "sales"].includes(role)) fail("--role must be super_admin, admin or sales.");
if (password.length < 8) fail("--password must be at least 8 characters.");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUserByEmail(target) {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`Could not list users: ${error.message}`);
    const match = data.users.find((user) => user.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

let user = await findUserByEmail(email);
let created = false;
if (!user) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, full_name: name },
  });
  if (error) fail(`Could not create the account: ${error.message}`);
  user = data.user;
  created = true;
}

// The signup trigger normally creates the profile; make sure it exists.
await supabase.from("profiles").upsert({ id: user.id, email, name }, { onConflict: "id", ignoreDuplicates: true });

const { error: roleError } = await supabase.from("profiles")
  .update({ role, updated_at: new Date().toISOString() }).eq("id", user.id);
if (roleError) {
  if (roleError.message.includes("profiles_role_check")) {
    fail("Run supabase/migrations/2026101202_leads_rbac.sql in the Supabase SQL editor first, then try again.");
  }
  fail(`Could not set the role: ${roleError.message}`);
}

const { data: check } = await supabase.from("profiles").select("email,role").eq("id", user.id).single();
const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:5173";

console.log(`\n✔ ${created ? "Created" : "Updated existing"} account — role: ${check?.role}`);
console.log(`  Email:    ${email}`);
if (created) console.log(`  Password: ${password}${generated ? "   (generated — change it after signing in)" : ""}`);
else console.log("  Password: unchanged (use your existing password)");
console.log(`  Sign in:  ${site}/login\n`);
