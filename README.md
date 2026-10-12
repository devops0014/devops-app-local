# DevOpsCrack

Free DevOps interview preparation kit built with the Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Radix UI, Zustand, Recharts, Lucide React, and Supabase.

Everything is free for every signed-in user — no plans, no payments, no paywall.

## Included experience

- Dark-first landing page, responsive navigation, and sign-in
- Student dashboard with streaks, daily goals, XP, category mastery, and charts
- Searchable question bank with filters, answer reveal, notes, confidence, bookmarks, mastery states, and J/K shortcuts
- Timed and classic quizzes, and swipe flashcards
- Analytics with radar/area charts, activity heatmap, strengths, weaknesses, and quiz history
- Leaderboard and achievements
- Admin workspace for questions, students, categories, CSV/JSON import, and an optional AI content engine
- Supabase PostgreSQL schema, row-level security, profile trigger, and seed data

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase credentials.
3. Run `supabase/schema.sql`, every file in `supabase/migrations` in filename order, and then `supabase/seed.sql` in the Supabase SQL editor.
4. In Supabase Auth, enable Email/Password and Google.
5. Start the app with `npm run dev`.

Core student learning modes require Supabase so local testing matches production behavior.

### Upgrading an existing database

If your Supabase project was set up when the app still had paid plans, run
`supabase/migrations/2026101201_free_access.sql`. It lets every signed-in user
read questions, stops new accounts getting an expiring trial, and clears any
expired plans. It does not delete data; an optional cleanup block at the bottom
drops the old payment and mock-interview tables if you want them gone.

## End-to-end local verification

Add a test student to `.env.local`:

```env
LOCAL_TEST_EMAIL=student-test@example.com
LOCAL_TEST_PASSWORD=replace-with-test-password
```

Start the app with `npm run dev`, then run `npm run test:local-e2e` in a second terminal.

## Production notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- `OPENAI_API_KEY` is optional and only used by the admin AI content engine.
- Enforce admin access on the server; never rely only on hiding the admin navigation item.
