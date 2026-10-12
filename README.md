# DevOpsCrack

Free DevOps interview preparation kit built with the Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Radix UI, Zustand, Recharts, Lucide React, and Supabase.

Everything is free for every signed-in user — no plans, no payments, no paywall.
Students verify their WhatsApp number once at sign-up, and your team works the
resulting leads from a built-in dashboard.

## Included experience

- Dark-first landing page, responsive navigation, and sign-in
- Student dashboard with streaks, daily goals, XP, category mastery, and charts
- Searchable question bank with filters, answer reveal, notes, confidence, bookmarks, mastery states, and J/K shortcuts
- Timed and classic quizzes, and swipe flashcards
- Analytics with radar/area charts, activity heatmap, strengths, weaknesses, and quiz history
- Leaderboard and achievements
- WhatsApp OTP phone verification with contact consent for every student
- Leads dashboard: registrations by day (IST), call status, notes timeline, click-to-call / WhatsApp, CSV export
- Role-based access: student, sales team, content admin, super admin
- Admin workspace for questions, students, categories, CSV/JSON import, and an optional AI content engine
- Supabase PostgreSQL schema, row-level security, profile trigger, and seed data

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase credentials.
3. Run `supabase/schema.sql`, every file in `supabase/migrations` in filename order, and then `supabase/seed.sql` in the Supabase SQL editor.
4. In Supabase Auth, enable Email/Password and Google.
5. Start the app with `npm run dev`.

Core student learning modes require Supabase so local testing matches production behavior.

### Roles and your super admin account

| Role | Can do |
| --- | --- |
| Student | Question bank, quizzes, flashcards (after WhatsApp verification) |
| Sales team | Leads dashboard: view students, call, set status, add notes |
| Content admin | Questions, categories, imports, AI content engine |
| Super admin | Everything, plus CSV export of leads and managing team roles |

After running the migrations, sign up with your own email, then run once in the
Supabase SQL editor:

```sql
update public.profiles set role = 'super_admin' where email = 'you@example.com';
```

From then on, add teammates from **Team & roles** in the app: they sign up
normally, you enter their email and pick a role.

### WhatsApp OTP setup (Meta WhatsApp Business Cloud API)

1. In Meta Business Manager, add a WhatsApp Business account and a sender phone number.
2. In WhatsApp Manager create an **Authentication** template with a **Copy code**
   button (e.g. named `verification_code`, language `en`) and wait for approval.
3. Create a System User with a permanent token that has `whatsapp_business_messaging`.
4. Set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_OTP_TEMPLATE`
   and `WHATSAPP_OTP_LANGUAGE` on the server.

For local testing without WhatsApp, set `OTP_DEV_MODE=1`; the code is shown on
screen instead of being sent. Never enable it in production.

Codes are 6 digits, stored hashed, expire after 10 minutes, allow 5 attempts,
and can be re-sent once a minute (max 5 per hour). One verified number per account.

### Upgrading an existing database

Run any migrations you haven't applied yet, in filename order. The two newest are
`2026101201_free_access.sql` and `2026101202_leads_rbac.sql` (roles, WhatsApp
verification, leads). `2026101201_free_access.sql` lets every signed-in user
read questions, stops new accounts getting an expiring trial, and clears any
expired plans. Neither deletes data; an optional cleanup block at the bottom of
the free-access file drops the old payment and mock-interview tables if you want
them gone.

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
