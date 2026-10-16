-- Simple phone confirmation (no code) and blocking accounts with wrong numbers.
-- Run after 2026101302_interest_topic.sql. Safe to run more than once.

-- How the student's number was checked: 'none' (typed and confirmed by the
-- student), 'whatsapp' (sent us a WhatsApp message) or 'otp' (entered a code).
alter table public.profiles add column if not exists phone_verification_method text
  check (phone_verification_method is null or phone_verification_method in ('none', 'whatsapp', 'otp'));

-- Accounts removed by the team because the number was wrong.
-- Kept after the account is deleted so the same wrong number can't be reused
-- and the student sees why they were removed when they try to sign in.
create table if not exists public.blocked_contacts (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  name text,
  reason text not null check (reason in ('unreachable', 'someone_else', 'fake')),
  note text check (note is null or char_length(note) <= 500),
  blocked_by uuid references public.profiles(id) on delete set null,
  blocked_at timestamptz not null default now()
);
create index if not exists blocked_contacts_email_idx on public.blocked_contacts (lower(email));
create index if not exists blocked_contacts_phone_idx on public.blocked_contacts (phone);

-- Server-only.
alter table public.blocked_contacts enable row level security;
