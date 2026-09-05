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

Never expose the service-role key to browser code. Payment webhooks, privileged
AI processing, audit writes, and subscription changes must use server-side
functions with the service role.

## Phase 6 payment setup

Run `migrations/2026072702_phase6_payments.sql`, then configure the payment
variables listed in `.env.example` on the hosting platform.

- Razorpay webhook: `/api/webhooks/razorpay`
- Razorpay events: `subscription.authenticated`, `subscription.activated`,
  `subscription.charged`, `subscription.pending`, `subscription.cancelled`

Create matching monthly, half-yearly, and yearly Razorpay subscription plans
and copy their IDs into the corresponding environment variables.
Checkout, signature verification, subscription activation, idempotency, and
cancellation all run server-side.

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
