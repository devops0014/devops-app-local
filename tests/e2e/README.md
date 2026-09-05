# DevOpsCrack browser E2E tests

These Playwright tests cover the real Supabase-backed student and admin journeys.
They do not mock authentication or the database.

## One-time setup

1. Create two dedicated Supabase Auth users.
2. Set the student profile to `subscription_status = 'active'`.
3. Set the admin profile to `role = 'admin'`.
4. Copy `.env.e2e.example` to `.env.e2e` and enter those test credentials.
5. Install the browser: `npx playwright install chromium`.

## Run

Load the test variables into your terminal, then run:

```bash
set -a
source .env.e2e
set +a
npm run test:e2e
```

Useful focused commands:

```bash
npm run test:e2e:student
npm run test:e2e:admin
npm run test:e2e:headed
npm run test:e2e:ui
```

The admin suite runs serially. It creates a uniquely named category and question,
verifies publishing, and deletes both at the end. Screenshots, videos and traces
are retained only for failures.

Google OAuth and Razorpay recurring mandates are intentionally manual tests:
both leave the application and depend on third-party test environments. OpenAI
enrichment is also excluded by default to avoid spending credits.
