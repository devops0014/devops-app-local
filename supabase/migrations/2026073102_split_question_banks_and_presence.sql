-- Split content banks without deleting the legacy questions table.
create extension if not exists pgcrypto;
create table if not exists public.mcq_questions (
  id uuid primary key default gen_random_uuid(),
  source_key text,
  category_id uuid not null references public.categories(id) on delete restrict,
  question_text text not null,
  answer_text text not null,
  topic text,
  subtopic text,
  experience text,
  interview_round text,
  difficulty text not null check (difficulty in ('Easy','Medium','Hard')),
  company_asked text[] not null default '{}',
  tags text[] not null default '{}',
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2),
  correct_option integer not null check (correct_option >= 0),
  explanation text,
  source_hash text not null unique,
  is_published boolean not null default false,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_by uuid references public.profiles(id) on delete set null,
  import_job_id uuid references public.ai_processing_jobs(id) on delete set null,
  import_row_number integer,
  enrichment_status text not null default 'ready' check (enrichment_status in ('queued','processing','ready','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.general_questions (
  id uuid primary key default gen_random_uuid(),
  source_key text,
  category_id uuid not null references public.categories(id) on delete restrict,
  question_text text not null,
  answer_text text not null,
  topic text,
  subtopic text,
  experience text,
  interview_round text,
  question_type text not null default 'general' check (question_type in ('general','scenario','troubleshooting','behavioral')),
  difficulty text not null check (difficulty in ('Easy','Medium','Hard')),
  company_asked text[] not null default '{}',
  tags text[] not null default '{}',
  explanation text,
  expected_keywords text[] not null default '{}',
  hints text[] not null default '{}',
  source_hash text not null unique,
  is_published boolean not null default false,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_by uuid references public.profiles(id) on delete set null,
  import_job_id uuid references public.ai_processing_jobs(id) on delete set null,
  import_row_number integer,
  enrichment_status text not null default 'ready' check (enrichment_status in ('queued','processing','ready','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mcq_questions_category_idx on public.mcq_questions(category_id, difficulty) where is_published;
create index if not exists general_questions_category_type_idx on public.general_questions(category_id, question_type, difficulty) where is_published;

create table if not exists public.general_question_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.general_questions(id) on delete cascade,
  status public.progress_status not null default 'Not Started',
  confidence_score smallint check (confidence_score between 1 and 5),
  is_bookmarked boolean not null default false,
  personal_note text,
  last_attempt_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);
alter table public.general_question_progress enable row level security;
drop policy if exists "own_general_progress" on public.general_question_progress;
create policy "own_general_progress" on public.general_question_progress for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table if not exists public.general_flashcard_reviews (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.general_questions(id) on delete cascade,
  interval_days integer not null default 1,
  review_count integer not null default 0,
  last_result text,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  primary key (user_id, question_id)
);
alter table public.general_flashcard_reviews enable row level security;
drop policy if exists "own_general_flashcards" on public.general_flashcard_reviews;
create policy "own_general_flashcards" on public.general_flashcard_reviews for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Copy existing content once, allowing current installations to retain their data.
insert into public.mcq_questions (id,source_key,category_id,question_text,answer_text,difficulty,company_asked,tags,options,correct_option,explanation,source_hash,is_published,review_status,created_by,created_at)
select id,source_key,category_id,question_text,answer_text,difficulty,company_asked,tags,options,correct_option,explanation,
       coalesce(source_hash, encode(digest(lower(trim(question_text)) || ':' || category_id::text, 'sha256'),'hex')),
       is_published,case when review_status in ('pending','approved','rejected') then review_status else 'pending' end,created_by,created_at
from public.questions
where options is not null and jsonb_typeof(options)='array' and jsonb_array_length(options)>=2 and correct_option is not null
on conflict do nothing;

insert into public.general_questions (id,source_key,category_id,question_text,answer_text,question_type,difficulty,company_asked,tags,explanation,expected_keywords,hints,source_hash,is_published,review_status,created_by,created_at)
select id,source_key,category_id,question_text,answer_text,
  case lower(coalesce(question_type,'conceptual'))
    when 'scenario' then 'scenario' when 'troubleshooting' then 'troubleshooting'
    when 'hands-on' then 'troubleshooting' when 'behavioral' then 'behavioral' else 'general' end,
  difficulty,company_asked,tags,explanation,coalesce(expected_keywords,'{}'),coalesce(hints,'{}'),
  coalesce(source_hash, encode(digest(lower(trim(question_text)) || ':' || category_id::text, 'sha256'),'hex')),
  is_published,case when review_status in ('pending','approved','rejected') then review_status else 'pending' end,created_by,created_at
from public.questions
where not (options is not null and jsonb_typeof(options)='array' and jsonb_array_length(options)>=2 and correct_option is not null)
on conflict do nothing;

alter table public.mcq_questions enable row level security;
alter table public.general_questions enable row level security;
drop policy if exists "published_mcqs_read" on public.mcq_questions;
create policy "published_mcqs_read" on public.mcq_questions for select using (is_published or public.is_admin());
drop policy if exists "published_general_read" on public.general_questions;
create policy "published_general_read" on public.general_questions for select using (is_published or public.is_admin());
drop policy if exists "admin_mcqs_all" on public.mcq_questions;
create policy "admin_mcqs_all" on public.mcq_questions for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin_general_all" on public.general_questions;
create policy "admin_general_all" on public.general_questions for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Presence is derived from an authenticated heartbeat, never from a static flag.
alter table public.user_sessions add column if not exists presence_status text not null default 'offline' check (presence_status in ('online','offline'));
alter table public.user_sessions add column if not exists presence_updated_at timestamptz not null default now();
