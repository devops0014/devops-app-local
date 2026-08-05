# DevOpsCrack end-to-end testing guide

This guide tests the application from both the student and admin perspectives
before UAT. Automated Playwright coverage is under `tests/e2e`.

## Test data

Use dedicated accounts, never personal or production accounts.

| Account | Required profile state | Purpose |
| --- | --- | --- |
| Student | `role=student`, `subscription_status=active` | Paid learning journey |
| Admin | `role=admin` | Content and platform management |
| New user | No existing Auth account | Signup and verification |
| Unsubscribed user | `role=student`, inactive subscription | Pricing wall |

Create the accounts in Supabase Authentication, then ensure matching rows exist
in `public.profiles`. Keep test credentials only in `.env.e2e`, which must not be
committed.

## Automated browser suite

```bash
cp .env.e2e.example .env.e2e
# Edit .env.e2e with the dedicated account credentials.
npx playwright install chromium
set -a
source .env.e2e
set +a
npm run test:e2e
```

Expected result: 12 tests pass across desktop Chromium and mobile Chrome. On a
failure, open `playwright-report/index.html`. The suite keeps a screenshot, video
and trace for failed tests.

## Automated coverage

| Area | Student | Admin |
| --- | --- | --- |
| Email/password login | Yes | Yes |
| Protected route redirect | Yes | Yes |
| Role-based `/admin` security | Yes | Yes |
| Subscription gate | Active student | Admin bypass |
| Question bank and answer reveal | Yes | Publishing verified |
| Quiz and flashcard entry | Yes | MCQ content created |
| Analytics | Yes | Platform tabs verified |
| Category CRUD | — | Create, edit, delete |
| Question CRUD | Published question read | Create, edit, publish, delete |
| CSV validation preview | — | Valid and invalid rows |
| Responsive mobile flow | Yes | Desktop admin |

## Manual tests that must remain manual

### Signup and email verification

1. Create a new account with name, mobile, email and password.
2. Confirm the large verification dialog appears.
3. Open the Supabase verification email.
4. Verify the redirect returns to the configured application URL.
5. Confirm the profile shows the new user’s own name, mobile and email.

### Google OAuth

1. Click **Continue with Google**.
2. Sign in with a Google test account.
3. Confirm the callback reaches `/dashboard`.
4. Confirm signing out clears the session.

### Razorpay test subscription

1. Confirm the Razorpay dashboard and application both use **Test Mode** keys.
2. Purchase each plan using Razorpay’s documented test payment details.
3. Confirm checkout success, signature verification and webhook delivery.
4. Confirm `subscriptions`, `payments` and the profile subscription status update.
5. Test cancellation and failed-payment handling.

Do not enter a real card into test mode. Recurring mandate behaviour depends on
Razorpay’s test environment and cannot be reliably automated in a browser suite.

### AI enrichment and evaluation

1. Import a single non-sensitive test question.
2. Run enrichment from **AI Engine → Processing queue**.
3. Confirm the server worker finishes without a 401 response.
4. Edit the enrichment, approve it, and confirm the next pending item opens.
5. Run a mock interview with intentionally irrelevant answers.
6. Confirm scoring is low and feedback cites missing expected concepts.

AI tests are manual by default because they consume credits and model output is
non-deterministic.

## Exit criteria before UAT

- All Playwright tests pass twice consecutively.
- `npm run test:ci` passes.
- No browser console errors occur in student or admin journeys.
- Supabase RLS prevents student writes to admin tables.
- Razorpay webhook signatures are verified and duplicate events are idempotent.
- AI endpoints reject unauthenticated users and enforce usage limits.
- No `.env`, secret key, service-role key or test password is committed.
