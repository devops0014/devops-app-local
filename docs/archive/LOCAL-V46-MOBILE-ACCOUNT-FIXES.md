# DevOpsCrack local v46

## Included fixes

- Sign-out dialog now uses a full browser redirect to `/` when **Close** is selected, so mobile browsers do not remain on a cached dashboard.
- Account settings now open a dedicated `/change-password` page.
- Password changes require the current password, a new password, and confirmation.
- The current password is reverified with Supabase before the password is changed.
- Successful password changes end the local session and redirect to `/login`.
- Forgot-password recovery remains available and also signs the user out after a successful reset.
- A compact Total XP and Level card is visible at the top of the dashboard on mobile and tablet layouts.

## Quick verification

1. Sign in on a mobile browser, open the account menu, select **Sign out securely**, and then select **Close**. The home page should open immediately without refreshing.
2. Open **Account settings → Update password**. An incorrect current password should be rejected. A successful update should redirect to the login page and require the new password.
3. Open the dashboard below the desktop breakpoint. The Total XP card should appear above the welcome section.

## Validation completed

- Unit tests: passed
- Lint: passed with existing non-blocking warnings only
- Production build and artifact validation: passed
- Browser interaction check: sign-out Close action redirected to the home page
