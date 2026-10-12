-- Free WhatsApp phone verification: the student sends a short code to your
-- WhatsApp Business number; the webhook matches it and verifies their account.
-- Inbound messages are not billed by Meta. Run after 2026101202_leads_rbac.sql.

create table if not exists public.phone_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed')),
  phone text,
  error text,
  consent_at timestamptz not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists phone_verification_requests_user_idx
  on public.phone_verification_requests (user_id, created_at desc);

-- Server-only: no client policies.
alter table public.phone_verification_requests enable row level security;
