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
- Leads dashboard: new sign-ups by day (IST), follow-ups due, callback requests; call status, owner, follow-up date, notes timeline, hot/warm/cold engagement score, ad source, click-to-call / WhatsApp, CSV export
- Ad attribution (UTM / fbclid first touch) and Meta Pixel + Conversions API for verified sign-ups
- "Request a callback" course banner on the dashboard and quiz results
- Privacy policy, terms, and consent withdrawal (account setting or reply STOP on WhatsApp)
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

### Your business details

Edit **`lib/site-config.ts`**: business name, contact email, location, course
name and pitch, optional course URL and social links. The privacy policy, terms,
landing page and in-app course banner all read from it. Have the privacy policy
and terms reviewed before you run ads.

### Roles and your super admin account

| Role | Can do |
| --- | --- |
| Student | Question bank, quizzes, flashcards (after WhatsApp verification) |
| Sales team | Leads dashboard: view students, call, set status, add notes |
| Content admin | Questions, categories, imports, AI content engine |
| Super admin | Everything, plus CSV export of leads and managing team roles |

After running the migrations, create your super admin from the project folder:

```bash
npm run create-admin -- --email you@example.com --password 'YourStrongPassword'
```

It uses `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`, creates a confirmed
account (or upgrades an existing one) and prints the sign-in details. Leave out
`--password` to get a generated one. Use `--role sales` or `--role admin` for
team accounts.

Or, if you already signed up in the app, run once in the Supabase SQL editor:

```sql
update public.profiles set role = 'super_admin' where email = 'you@example.com';
```

From then on, add teammates from **Team & roles** in the app: they sign up
normally, you enter their email and pick a role.

### WhatsApp verification setup (free, Meta WhatsApp Business Cloud API)

Students verify by **sending** a message to your WhatsApp Business number: they
tap "Verify on WhatsApp", WhatsApp opens with `VERIFY DC-XXXXXXXX` pre-filled,
they press Send, and the webhook unlocks their account. Meta doesn't bill
inbound messages, and the "You're verified" reply is free inside the 24-hour
customer service window. The phone number comes from WhatsApp itself, so it
can't be mistyped or faked.

1. In Meta for Developers, create an app (type **Business**) and add the
   **WhatsApp** product. Add your business phone number in WhatsApp Manager.
2. Set on the server:
   - `WHATSAPP_BUSINESS_NUMBER` — that number, digits only (e.g. `919876543210`)
   - `WHATSAPP_APP_SECRET` — App settings → Basic → App secret
   - `WHATSAPP_WEBHOOK_VERIFY_TOKEN` — any long random string you choose
   - `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` — for the confirmation
     reply (System User permanent token with `whatsapp_business_messaging`)
3. In the app's **WhatsApp → Configuration → Webhook**, set the callback URL to
   `https://YOUR-DOMAIN/api/webhooks/whatsapp`, paste the same verify token,
   click **Verify and save**, then subscribe to the **messages** field.

**Testing on your laptop:** Meta must reach the webhook over public HTTPS. Run
`ngrok http 5173` and use the ngrok URL as the callback URL while testing. Or set
`WHATSAPP_DEV_MODE=1` (with the webhook variables unset) to get a "Simulate"
box on the verify screen. Never enable dev mode in production.

Codes are valid for 15 minutes, one verified number per account. To switch to
the old "we send you a 6-digit code" flow (billed by Meta as authentication
messages), set `PHONE_VERIFY_METHOD=otp` and `WHATSAPP_OTP_TEMPLATE`.

### Tracking your ads

Add UTM tags to every link you post or advertise, for example:

```
https://YOUR-DOMAIN/?utm_source=meta&utm_medium=paid&utm_campaign=k8s-oct
https://YOUR-DOMAIN/?utm_source=linkedin&utm_medium=organic&utm_campaign=post-terraform-quiz
```

The first link a visitor arrives from is remembered for 30 days and saved on
their profile when they sign up, so the leads dashboard can filter by source.
Meta and LinkedIn click IDs are recognised even without UTM tags.

For Meta, set `NEXT_PUBLIC_META_PIXEL_ID` and `META_CAPI_ACCESS_TOKEN`. The app
sends `PageView`, `CompleteRegistration` when a student verifies on WhatsApp (from
both the browser and the server, de-duplicated by event ID) and `Lead` when they
request a callback. Optimise your campaigns for **CompleteRegistration**.

### Upgrading an existing database

Run any migrations you haven't applied yet, in filename order. The two newest are
`2026101201_free_access.sql`, `2026101202_leads_rbac.sql` (roles, leads) and
`2026101203_whatsapp_inbound_verify.sql` (free WhatsApp verification) and
`2026101301_sales_tools.sql` (lead source, onboarding answers, follow-ups, callbacks) and
`2026101302_interest_topic.sql` (the tool a student picked on the home page). `2026101201_free_access.sql` lets every signed-in user
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
