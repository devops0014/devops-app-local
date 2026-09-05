-- DevOpsCrack Phase 5: complete learning, AI-content, commerce, and audit model.
-- Apply after supabase/schema.sql.

create extension if not exists "pgcrypto";

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.mock_interviews add column if not exists technology text;
alter table public.mock_interviews add column if not exists company text;
alter table public.mock_interviews add column if not exists experience_level text;
alter table public.mock_interviews add column if not exists difficulty text;

alter table public.questions add column if not exists source_type text not null default 'original';
alter table public.questions add column if not exists source_key text unique;
alter table public.questions add column if not exists source_question_id uuid references public.questions(id) on delete set null;
alter table public.questions add column if not exists review_status text not null default 'approved';
alter table public.questions add column if not exists ai_confidence numeric(5,2);
alter table public.questions add column if not exists published_at timestamptz;

alter table public.quiz_attempts drop constraint if exists quiz_attempts_mode_check;
alter table public.quiz_attempts add constraint quiz_attempts_mode_check
  check (mode in ('MCQ','Interview','Scenario','Rapid Fire','Hands-on','Adaptive','Flashcards'));

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  parent_topic_id uuid references public.topics(id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  difficulty public.question_difficulty not null default 'Easy',
  estimated_minutes integer not null default 30 check (estimated_minutes > 0),
  prerequisites uuid[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(category_id, slug)
);

create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  experience_level text not null,
  estimated_hours numeric(7,2) not null default 0,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_path_steps (
  id uuid primary key default gen_random_uuid(),
  learning_path_id uuid not null references public.learning_paths(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  step_order integer not null,
  xp_reward integer not null default 100,
  required_mastery integer not null default 70 check (required_mastery between 0 and 100),
  unique(learning_path_id, step_order),
  unique(learning_path_id, topic_id)
);

create table if not exists public.question_variants (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  variant_type text not null check (variant_type in (
    'basic','intermediate','advanced','scenario','troubleshooting',
    'production','architecture','hands_on','rapid_fire','whiteboard'
  )),
  question_text text not null,
  answer_text text not null,
  difficulty public.question_difficulty not null,
  metadata jsonb not null default '{}'::jsonb,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  ai_confidence numeric(5,2),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mcqs (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete cascade,
  variant_id uuid references public.question_variants(id) on delete cascade,
  prompt text not null,
  options jsonb not null,
  correct_option integer not null,
  explanation text not null,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  check (question_id is not null or variant_id is not null)
);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete cascade,
  front_text text not null,
  back_text text not null,
  tags text[] not null default '{}',
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete cascade,
  title text not null,
  context text not null,
  task text not null,
  expected_signals jsonb not null default '[]'::jsonb,
  solution text not null,
  difficulty public.question_difficulty not null,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.troubleshooting_exercises (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete cascade,
  title text not null,
  symptoms jsonb not null,
  evidence jsonb not null default '[]'::jsonb,
  root_cause text not null,
  investigation_steps jsonb not null,
  resolution text not null,
  prevention text,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, question_id)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, question_id)
);

create table if not exists public.revision_schedule (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  interval_days integer not null default 1 check (interval_days between 1 and 365),
  ease_factor numeric(4,2) not null default 2.50,
  review_count integer not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  last_result text check (last_result in ('known','revision')),
  primary key(user_id, question_id)
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  icon text not null,
  rarity text not null default 'common' check (rarity in ('common','rare','epic','legendary')),
  xp_reward integer not null default 0,
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key(user_id, badge_id)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_type text not null,
  title text not null,
  metadata jsonb not null default '{}'::jsonb,
  earned_at timestamptz not null default now()
);

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  source text not null,
  source_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.content_uploads (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  source_format text not null check (source_format in ('csv','json','markdown','pdf')),
  status text not null default 'uploaded' check (status in ('uploaded','processing','completed','failed')),
  extracted_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.content_uploads(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  stage text not null default 'queued',
  status text not null default 'queued' check (status in ('queued','running','review','completed','failed')),
  progress integer not null default 0 check (progress between 0 and 100),
  model_provider text,
  model_name text,
  source_question_count integer not null default 0,
  generated_count integer not null default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_content_metadata (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.ai_processing_jobs(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  original_content jsonb,
  generation_prompt text,
  model_response jsonb,
  confidence numeric(5,2),
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null check (provider = 'razorpay'),
  provider_payment_id text not null unique,
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null,
  status text not null,
  invoice_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists topics_category_idx on public.topics(category_id, sort_order);
create index if not exists variants_review_idx on public.question_variants(review_status, created_at desc);
create index if not exists revision_due_idx on public.revision_schedule(user_id, next_review_at);
create index if not exists xp_events_user_idx on public.xp_events(user_id, created_at desc);
create index if not exists ai_jobs_status_idx on public.ai_processing_jobs(status, created_at desc);
create index if not exists activity_logs_created_idx on public.activity_logs(created_at desc);

alter table public.topics enable row level security;
alter table public.learning_paths enable row level security;
alter table public.learning_path_steps enable row level security;
alter table public.question_variants enable row level security;
alter table public.mcqs enable row level security;
alter table public.flashcards enable row level security;
alter table public.scenarios enable row level security;
alter table public.troubleshooting_exercises enable row level security;
alter table public.bookmarks enable row level security;
alter table public.notes enable row level security;
alter table public.revision_schedule enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.achievements enable row level security;
alter table public.xp_events enable row level security;
alter table public.content_uploads enable row level security;
alter table public.ai_processing_jobs enable row level security;
alter table public.ai_content_metadata enable row level security;
alter table public.payments enable row level security;
alter table public.activity_logs enable row level security;

create policy "topics_subscriber_read" on public.topics for select to authenticated using (true);
create policy "paths_subscriber_read" on public.learning_paths for select to authenticated using (is_published or public.is_admin());
create policy "path_steps_subscriber_read" on public.learning_path_steps for select to authenticated using (true);
create policy "variants_approved_read" on public.question_variants for select to authenticated using (review_status = 'approved' or public.is_admin());
create policy "mcqs_approved_read" on public.mcqs for select to authenticated using (review_status = 'approved' or public.is_admin());
create policy "flashcards_approved_read" on public.flashcards for select to authenticated using (review_status = 'approved' or public.is_admin());
create policy "scenarios_approved_read" on public.scenarios for select to authenticated using (review_status = 'approved' or public.is_admin());
create policy "troubleshooting_approved_read" on public.troubleshooting_exercises for select to authenticated using (review_status = 'approved' or public.is_admin());

create policy "bookmarks_own_all" on public.bookmarks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_own_all" on public.notes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "revision_own_all" on public.revision_schedule for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "badges_authenticated_read" on public.badges for select to authenticated using (true);
create policy "user_badges_own_read" on public.user_badges for select to authenticated using (auth.uid() = user_id);
create policy "achievements_own_read" on public.achievements for select to authenticated using (auth.uid() = user_id);
create policy "xp_events_own_read" on public.xp_events for select to authenticated using (auth.uid() = user_id);
create policy "payments_own_read" on public.payments for select to authenticated using (auth.uid() = user_id);

create policy "uploads_admin_all" on public.content_uploads for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ai_jobs_admin_all" on public.ai_processing_jobs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ai_metadata_admin_all" on public.ai_content_metadata for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "activity_admin_read" on public.activity_logs for select to authenticated using (public.is_admin());

create policy "topics_admin_write" on public.topics for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "paths_admin_write" on public.learning_paths for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "steps_admin_write" on public.learning_path_steps for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "variants_admin_write" on public.question_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "mcqs_admin_write" on public.mcqs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "flashcards_admin_write" on public.flashcards for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "scenarios_admin_write" on public.scenarios for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "troubleshooting_admin_write" on public.troubleshooting_exercises for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-imports',
  'question-imports',
  false,
  26214400,
  array['text/csv','application/json','text/markdown','text/plain','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "admin_upload_question_sources"
on storage.objects for insert to authenticated
with check (bucket_id = 'question-imports' and public.is_admin());

create policy "admin_read_question_sources"
on storage.objects for select to authenticated
using (bucket_id = 'question-imports' and public.is_admin());

create policy "admin_delete_question_sources"
on storage.objects for delete to authenticated
using (bucket_id = 'question-imports' and public.is_admin());

alter publication supabase_realtime add table public.user_progress;
alter publication supabase_realtime add table public.quiz_attempts;
alter publication supabase_realtime add table public.mock_interviews;
alter publication supabase_realtime add table public.ai_processing_jobs;
