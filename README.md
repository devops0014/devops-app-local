# DevOpsCrack

Premium DevOps interview preparation SaaS built with the Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Radix UI, Zustand, Recharts, Lucide React, and Supabase integration scaffolding.

## Included experience

- Premium dark-first landing page, responsive navigation, pricing, and sign-in
- Student dashboard with streaks, daily goals, XP, category mastery, and charts
- Searchable question bank with filters, answer reveal, notes, confidence, bookmarks, mastery states, and J/K shortcuts
- Timed quiz, swipe flashcards, and full-screen mock interview with final feedback report
- Analytics with radar/area charts, activity heatmap, strengths, weaknesses, time allocation, and attempt history
- Admin workspace for questions, students, categories, CSV/JSON import, and revenue
- Supabase PostgreSQL schema, row-level security, profile trigger, and 15-question seed
- Razorpay subscription checkout and signed webhook processing

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase and payment credentials.
3. Run `supabase/schema.sql`, every file in `supabase/migrations` in filename order, and then `supabase/seed.sql` in the Supabase SQL editor.
4. In Supabase Auth, enable Email/Password and Google.
5. Start the app with `npm run dev`.

Core student learning modes require Supabase so local testing matches production behavior.

## End-to-end local verification

Add a dedicated subscribed test student to `.env.local`:

```env
LOCAL_TEST_EMAIL=student-test@example.com
LOCAL_TEST_PASSWORD=replace-with-test-password
RUN_AI_E2E=0
```

Start the app with `npm run dev`, then run `npm run test:local-e2e` in a second terminal.
After the normal checks pass, set `RUN_AI_E2E=1` to verify that an irrelevant
mock-interview answer scores 25 or lower. This consumes one mock-interview credit.

## Production notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` and Razorpay secrets server-only.
- Verify payment webhook signatures before changing subscription state.
- Use the `questions_read_subscribed` RLS policy as the subscription wall; the application should also redirect inactive users to `/pricing` for a friendly UX.
- Enforce admin access on the server using `ADMIN_EMAILS`; never rely only on hiding the admin navigation item.
- Store any mock-interview recordings in Supabase Storage with per-user access policies.
