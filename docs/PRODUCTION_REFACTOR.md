# Production refactor

## Architecture

- `lib/payments.ts` is the single typed subscription catalog. UI and APIs consume the same prices, entitlements and plan identifiers.
- Payments are Razorpay subscriptions only. Checkout is authenticated, rate limited and verified server-side; signed webhooks remain idempotent.
- `user_sessions` tracks a hashed installation fingerprint, never a raw refresh token. Two active installations are allowed and users can revoke an existing device before continuing.
- `user_ai_usage` meters mock interviews, resume reviews and tokens monthly. The database RPC performs the atomic limit check.
- `ai_response_cache` deduplicates permitted AI operations. Student learning content is read from the database; only answer evaluation, resume review, mock feedback, adaptive follow-ups and career suggestions can call AI.
- Admin uploads receive one-time enrichment for explanations, hints, keywords, difficulty, tags, relationships, follow-ups and common mistakes, followed by human approval.

## Security decisions

- Supabase access tokens are validated by Auth before protected API work.
- RLS protects user sessions, AI usage, notifications and cached responses.
- Financial and session mutations use the service role only after user verification.
- Device fingerprints are non-secret hashes. Refresh tokens remain under Supabase Auth rotation and are not stored in application tables.
- New-device alerts are always queued in `security_notifications`; configure `SECURITY_EMAIL_WEBHOOK_URL` to deliver the queued event through your transactional email workflow.
- API payload sizes and checkout/device requests are rate limited.
- Security headers in `worker/index.ts` provide the Next/Vite equivalent of Helmet.

## AI fair usage

Yearly UI displays fair usage. The database retains an abuse guard of 100 mock interviews and 10 resume reviews per calendar month. Change the limits in `consume_ai_credit` only after capacity review.

## Migration order

Run `2026072701`, `2026072702`, `2026072703`, then `2026072704_production_refactor.sql`. The final migration archives non-Razorpay payment history before enforcing Razorpay-only constraints.
