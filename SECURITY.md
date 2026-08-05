# Security policy

Report suspected vulnerabilities privately to the project owner. Do not open a public issue containing credentials, personal data, exploit details, or payment information.

Production secrets must be stored only in the deployment provider’s encrypted environment configuration. `.env*` files are ignored and must never be committed. The application validates webhook signatures, enforces Supabase RLS, adds baseline browser security headers, rejects oversized sensitive requests, and applies an application-level burst limiter. Provider-level WAF and distributed rate limiting remain required for a public launch.
