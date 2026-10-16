# DevOpsCrack Supabase setup

1. Create a Supabase project.
2. Run `schema.sql` in the SQL editor.
3. Run `migrations/2026072701_phase5_platform.sql`.
4. Run `seed.sql`.
5. Enable Email/Password and Google in Authentication providers.
6. Add the production URL and local URL to Auth redirect URLs.
7. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
8. Set the first administrator with:

```sql
update public.profiles
set role = 'admin'
where email = 'your-admin-email@example.com';
```

Never expose the service-role key to browser code. Privileged AI content
processing and audit writes must use server-side functions with the service role.

## Phase 6 (retired)

`migrations/2026072702_phase6_payments.sql` created the old payment tables. The
app no longer uses them; it is kept so existing databases migrate in order.

## Phase 7 gamification setup

Run `migrations/2026072703_phase7_gamification.sql` after the Phase 6 migration.
It adds authoritative XP events, duplicate-event protection, daily activity,
streak tracking, challenge progress, seeded badges, and the server-only reward
function. The browser never decides the final XP value; it only reports a
supported learning event and the server applies a capped reward.

## Admin content pipeline

Run all remaining migrations in filename order, ending with
`migrations/2026072902_admin_content_pipeline.sql`. This migration adds
duplicate-safe imports, enrichment and review state, admin audit visibility,
and the private `question-imports` Storage bucket.

1. Open **Admin → Questions → Bulk import**.
2. Preview CSV/JSON validation results and import valid rows.
3. Open **AI Engine → Processing queue** and run enrichment.
4. Review enriched questions in **Approval desk**.
5. Approve to publish to `/practice`, or reject to keep a question private.

## Free access

Run `migrations/2026101201_free_access.sql` last. It removes the subscription
requirement from question access so the platform is free for every signed-in
user, and retires the AI mock-interview credit function.

## Leads, WhatsApp verification and roles

Run `migrations/2026101202_leads_rbac.sql` after the free-access migration. It
adds the `sales` and `super_admin` roles, WhatsApp phone verification fields,
the `leads` and `lead_activity` tables, and a trigger that stops students from
changing their own role, XP or verified phone. Then promote yourself:

```sql
update public.profiles set role = 'super_admin' where email = 'you@example.com';
```

## Free WhatsApp verification

Run `migrations/2026101203_whatsapp_inbound_verify.sql` after the leads migration.
It stores the short `DC-XXXXXXXX` codes students send to your WhatsApp number.

## Sales tools

Run `migrations/2026101301_sales_tools.sql` last. It adds the lead source
(UTM) and onboarding answers to profiles, the "No answer" and "Enrolled"
statuses, follow-up dates, lead owners, callback requests and do-not-contact.

Then run `migrations/2026101302_interest_topic.sql`. It saves the tool a student
picked on the home page ("What's your interview on?") so callers can see it.

## Phone confirmation and blocking

Run `migrations/2026101601_phone_confirm_and_blocking.sql`. It records how each
student's number was checked and adds the `blocked_contacts` list used when the
team removes an account with a wrong mobile number.
