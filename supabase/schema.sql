-- DevOpsCrack production schema for Supabase/PostgreSQL
create extension if not exists "pgcrypto";

do $$ begin
  create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'cancelled', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_plan as enum ('monthly', 'half_yearly', 'yearly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.question_difficulty as enum ('Easy', 'Medium', 'Hard');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.progress_status as enum ('Not Started', 'Seen', 'Mastered', 'Need Revision');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  mobile text,
  avatar text,
  role text not null default 'student' check (role in ('student', 'admin')),
  subscription_status public.subscription_status not null default 'trialing',
  subscription_plan public.subscription_plan,
  subscription_expires_at timestamptz,
  streak integer not null default 0 check (streak >= 0),
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level > 0),
  daily_goal integer not null default 20 check (daily_goal > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null,
  slug text not null unique,
  color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  question_text text not null,
  answer_text text not null,
  difficulty public.question_difficulty not null,
  tags text[] not null default '{}',
  company_asked text[] not null default '{}',
  options jsonb,
  correct_option integer,
  is_bookmarked_count integer not null default 0 check (is_bookmarked_count >= 0),
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists questions_category_idx on public.questions(category_id);
create index if not exists questions_difficulty_idx on public.questions(difficulty);
create index if not exists questions_tags_gin_idx on public.questions using gin(tags);
create index if not exists questions_companies_gin_idx on public.questions using gin(company_asked);

create table if not exists public.user_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  status public.progress_status not null default 'Not Started',
  confidence_score smallint check (confidence_score between 1 and 5),
  is_bookmarked boolean not null default false,
  personal_note text,
  attempts integer not null default 0 check (attempts >= 0),
  last_attempt_at timestamptz,
  mastered_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists user_progress_status_idx on public.user_progress(user_id, status);
create index if not exists user_progress_bookmark_idx on public.user_progress(user_id, is_bookmarked) where is_bookmarked = true;

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('quiz', 'oral', 'flashcards')),
  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions > 0),
  time_taken integer not null default 0 check (time_taken >= 0),
  weak_categories jsonb not null default '[]'::jsonb,
  questions_snapshot jsonb not null default '[]'::jsonb,
  answers_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists quiz_attempts_user_created_idx on public.quiz_attempts(user_id, created_at desc);

create table if not exists public.mock_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  questions_snapshot jsonb not null,
  answers_given jsonb not null default '[]'::jsonb,
  feedback_ai jsonb,
  score integer check (score between 0 and 100),
  time_taken integer not null default 0,
  video_path text,
  status text not null default 'completed' check (status in ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz not null default now()
);

create index if not exists mock_interviews_user_created_idx on public.mock_interviews(user_id, created_at desc);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider = 'razorpay'),
  provider_customer_id text,
  provider_subscription_id text unique,
  plan public.subscription_plan not null,
  status public.subscription_status not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.questions enable row level security;
alter table public.user_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.mock_interviews enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "categories_read_authenticated" on public.categories;
create policy "categories_read_authenticated" on public.categories for select to authenticated using (true);

drop policy if exists "questions_read_subscribed" on public.questions;
create policy "questions_read_subscribed" on public.questions for select to authenticated using (
  is_published = true and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.subscription_status in ('trialing', 'active')
      and (p.subscription_expires_at is null or p.subscription_expires_at > now())
  )
);

drop policy if exists "progress_own_all" on public.user_progress;
create policy "progress_own_all" on public.user_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "attempts_own_all" on public.quiz_attempts;
create policy "attempts_own_all" on public.quiz_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "mock_own_all" on public.mock_interviews;
create policy "mock_own_all" on public.mock_interviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "subscriptions_read_own" on public.subscriptions;
create policy "subscriptions_read_own" on public.subscriptions for select using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar, subscription_status, subscription_expires_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'trialing',
    now() + interval '7 days'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Admin writes are intentionally handled through a server-side service role.
-- Never expose SUPABASE_SERVICE_ROLE_KEY in the browser.
