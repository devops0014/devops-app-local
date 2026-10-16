-- Lead generation, WhatsApp phone verification and role-based access.
-- Run after 2026101201_free_access.sql. Safe to run more than once.
--
-- Roles
--   student      learns on the platform (every new sign-up)
--   sales        team member who calls students: views leads, sets status, adds notes
--   admin        manages content (questions, categories, AI engine)
--   super_admin  everything above + manages the team's roles
--
-- Make yourself super admin after running this file:
--   update public.profiles set role = 'super_admin' where email = 'you@example.com';

-- 1. Roles -------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('student', 'sales', 'admin', 'super_admin'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

-- 2. Phone verification + consent on the profile -----------------------------
alter table public.profiles add column if not exists phone_verified_at timestamptz;
alter table public.profiles add column if not exists marketing_consent boolean not null default false;
alter table public.profiles add column if not exists marketing_consent_at timestamptz;

-- One verified WhatsApp number per account.
create unique index if not exists profiles_verified_mobile_unique
  on public.profiles (mobile) where phone_verified_at is not null;

create index if not exists profiles_role_created_idx on public.profiles (role, created_at desc);

-- 3. Students may edit their name/avatar, but never their role, XP, or the
--    verified phone. Server routes (service role) and the SQL editor have no
--    auth.uid() and are allowed through.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.phone_verified_at is distinct from old.phone_verified_at
     or new.marketing_consent is distinct from old.marketing_consent
     or new.marketing_consent_at is distinct from old.marketing_consent_at
     or new.xp is distinct from old.xp
     or new.level is distinct from old.level
     or new.streak is distinct from old.streak
     or new.email is distinct from old.email then
    raise exception 'These profile fields can only be changed by the server.' using errcode = '42501';
  end if;
  if old.phone_verified_at is not null and new.mobile is distinct from old.mobile then
    raise exception 'A verified phone number can only be changed through WhatsApp verification.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute procedure public.protect_profile_columns();

-- 4. WhatsApp OTP codes (hashed; only reachable through server routes) -------
create table if not exists public.phone_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  phone text not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists phone_otps_user_created_idx on public.phone_otps (user_id, created_at desc);
alter table public.phone_otps enable row level security;

-- 5. Leads: call status + activity timeline ----------------------------------
create table if not exists public.leads (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'new'
    check (status in ('new', 'interested', 'maybe_later', 'not_interested')),
  status_updated_at timestamptz,
  status_updated_by uuid references public.profiles(id) on delete set null,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists leads_status_idx on public.leads (status);
alter table public.leads enable row level security;

create table if not exists public.lead_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('comment', 'status')),
  body text check (body is null or char_length(body) <= 2000),
  status text,
  created_at timestamptz not null default now()
);
create index if not exists lead_activity_user_created_idx on public.lead_activity (user_id, created_at desc);
alter table public.lead_activity enable row level security;

-- No client policies on phone_otps, leads or lead_activity: browsers cannot
-- read or write them directly. All access goes through role-checked API routes.
