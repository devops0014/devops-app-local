# Testing and deployment

## Local testing

1. Copy `.env.example` to `.env.local` and add test credentials.
2. Create three Razorpay subscription plans for ₹199 monthly, ₹799 every six months, and ₹999 yearly. Set their IDs in the matching environment variables.
3. Run all Supabase migrations in filename order.
4. Run `npm run validate:env`, `npm run lint`, `npm run test:unit`, and `npm run build`.
5. Start with `npm run dev` and test at `http://localhost:5173`.

## Acceptance checklist

- Email/password and Google login return to the requested page.
- A non-subscriber reaches pricing; an active subscriber reaches platform routes.
- Each pricing card creates the matching Razorpay subscription and server verification activates the plan.
- Cancellation is scheduled at the cycle end and access remains active until then.
- The third unique browser installation sees both active devices, revokes one, and continues.
- Current device heartbeat updates `last_active`; sign-out/revocation deactivates the row.
- Monthly and six-month AI limits reject the next operation after their allowance.
- Yearly UI says fair usage and the abuse guard is enforced.
- Repeating identical AI input reads `ai_response_cache` rather than calling the model.
- Student quiz, MCQ, question, roadmap, note and explanation screens read stored database content.
- Admin upload enrichment stays private until approved.
- Dashboard shows plan, renewal, AI balances, reset date, devices and recent history.
- Mobile layout, keyboard focus, reduced motion, loading skeletons and empty states remain usable.

## Production deployment

1. Back up the Supabase database.
2. Apply `2026072704_production_refactor.sql` in staging and inspect archived legacy payment rows.
3. Configure production Razorpay plan IDs, key, secret and webhook secret.
4. Register `/api/webhooks/razorpay` and subscribe to authenticated, activated, charged, pending and cancelled events.
5. Keep `SUPABASE_SERVICE_ROLE_KEY`, payment secrets and `OPENAI_API_KEY` server-only.
6. Set Supabase production Site URL and allow only the exact production auth callback URLs.
7. Enable leaked-password protection, refresh-token reuse detection and suitable JWT expiry in Supabase Auth.
8. Run `STRICT_ENV=1 npm run validate:env`, then the full CI suite.
9. Deploy to staging, complete payment/auth/device/AI smoke tests, then promote the same artifact.
10. Monitor webhook failures, API rate limits, AI spend, database latency and client errors.

## Rollback

Keep the pre-migration backup and previous deployment artifact. Application rollback is immediate; database rollback should restore from backup because the migration archives and removes non-Razorpay payment rows.
