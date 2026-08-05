# DevOpsCrack production checklist

## Release gate

- Run `npm ci` and `npm run test:ci`.
- Run `STRICT_ENV=1 npm run validate:env` with production secrets supplied by the deployment platform.
- Apply `supabase/schema.sql`, all ordered migrations, and `supabase/seed.sql`.
- Confirm Supabase RLS policies with student and admin test accounts.
- Confirm Razorpay webhook signatures in live mode.
- Confirm Google OAuth redirect URLs for the production domain.
- Verify `/api/health` reports the expected capabilities without exposing secret values.

## Security and operations

- Keep service-role, payment, webhook, and AI keys server-side.
- Rotate credentials after staff changes or accidental exposure.
- Configure provider-side rate limiting/WAF rules in addition to the application burst limiter.
- Connect structured errors to the chosen monitoring vendor and configure uptime checks.
- Review Supabase audit logs, payment reconciliation, and failed webhook alerts.
- Test restore procedures before launch and on a recurring schedule.

## Experience

- Test keyboard-only navigation and screen-reader landmarks.
- Test reduced motion and a device without WebGL.
- Test iOS Safari, Android Chrome, desktop Chrome, Firefox, and Safari.
- Test offline fallback and reconnection sync.
- Run Lighthouse against landing, dashboard, practice, and mock-interview pages.
