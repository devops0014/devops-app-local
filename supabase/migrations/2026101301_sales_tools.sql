-- Sales tools: lead source tracking, onboarding answers, follow-ups,
-- assignment, callback requests and consent withdrawal.
-- Run after 2026101203_whatsapp_inbound_verify.sql. Safe to run more than once.

-- 1. Where the student came from (first touch) ---------------------------------
alter table public.profiles add column if not exists utm_source text;
alter table public.profiles add column if not exists utm_medium text;
alter table public.profiles add column if not exists utm_campaign text;
alter table public.profiles add column if not exists utm_content text;
alter table public.profiles add column if not exists referrer text;
alter table public.profiles add column if not exists landing_path text;
create index if not exists profiles_utm_source_idx on public.profiles (utm_source);

-- 2. Onboarding answers (shown to callers) -------------------------------------
alter table public.profiles add column if not exists experience_level text
  check (experience_level is null or experience_level in ('student', '0-1', '1-3', '3-5', '5+'));
alter table public.profiles add column if not exists job_title text
  check (job_title is null or char_length(job_title) <= 80);
alter table public.profiles add column if not exists career_goal text
  check (career_goal is null or career_goal in ('first_job', 'switch', 'upskill', 'promotion'));
alter table public.profiles add column if not exists city text
  check (city is null or char_length(city) <= 60);
alter table public.profiles add column if not exists onboarded_at timestamptz;

-- Students may fill these in themselves. Source fields are captured once at
-- sign-up by the trigger below and are then locked.
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
     or new.email is distinct from old.email
     or new.utm_source is distinct from old.utm_source
     or new.utm_medium is distinct from old.utm_medium
     or new.utm_campaign is distinct from old.utm_campaign
     or new.utm_content is distinct from old.utm_content
     or new.referrer is distinct from old.referrer
     or new.landing_path is distinct from old.landing_path then
    raise exception 'These profile fields can only be changed by the server.' using errcode = '42501';
  end if;
  if old.phone_verified_at is not null and new.mobile is distinct from old.mobile then
    raise exception 'A verified phone number can only be changed through WhatsApp verification.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Copy first-touch source from sign-up metadata into the profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (
    id, email, name, mobile, avatar, subscription_status, subscription_expires_at,
    utm_source, utm_medium, utm_campaign, utm_content, referrer, landing_path
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(meta->>'full_name', meta->>'name'),
    coalesce(meta->>'mobile', meta->>'phone'),
    coalesce(meta->>'avatar_url', meta->>'picture'),
    'active',
    null,
    left(nullif(meta->>'utm_source', ''), 100),
    left(nullif(meta->>'utm_medium', ''), 100),
    left(nullif(meta->>'utm_campaign', ''), 150),
    left(nullif(meta->>'utm_content', ''), 150),
    left(nullif(meta->>'referrer', ''), 300),
    left(nullif(meta->>'landing_path', ''), 300)
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    mobile = coalesce(public.profiles.mobile, excluded.mobile),
    avatar = coalesce(public.profiles.avatar, excluded.avatar);
  return new;
end;
$$;

-- 3. Lead workflow ---------------------------------------------------------------
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new', 'no_answer', 'interested', 'maybe_later', 'not_interested', 'enrolled'));

alter table public.leads add column if not exists follow_up_at date;
alter table public.leads add column if not exists assigned_to uuid references public.profiles(id) on delete set null;
alter table public.leads add column if not exists callback_requested_at timestamptz;
alter table public.leads add column if not exists do_not_contact boolean not null default false;
alter table public.leads add column if not exists do_not_contact_at timestamptz;

create index if not exists leads_follow_up_idx on public.leads (follow_up_at) where follow_up_at is not null;
create index if not exists leads_assigned_idx on public.leads (assigned_to);

alter table public.lead_activity drop constraint if exists lead_activity_kind_check;
alter table public.lead_activity add constraint lead_activity_kind_check
  check (kind in ('comment', 'status', 'follow_up', 'assigned', 'callback_request', 'opt_out'));
