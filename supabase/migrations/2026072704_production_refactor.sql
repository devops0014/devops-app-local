-- Production refactor: Razorpay-only subscriptions, device security, AI governance,
-- content enrichment and response caching. Safe to run more than once.

do $$
begin
  if exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='subscription_plan' and e.enumlabel='quarterly')
     and not exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='subscription_plan' and e.enumlabel='half_yearly') then
    alter type public.subscription_plan rename value 'quarterly' to 'half_yearly';
  end if;
end $$;

-- Preserve legacy financial data before enforcing Razorpay-only writes.
create table if not exists public.legacy_payment_records (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id text not null,
  payload jsonb not null,
  archived_at timestamptz not null default now(),
  unique(source_table, source_id)
);
alter table public.legacy_payment_records enable row level security;

insert into public.legacy_payment_records(source_table, source_id, payload)
select 'subscriptions', id::text, to_jsonb(s) from public.subscriptions s where provider <> 'razorpay'
on conflict do nothing;
insert into public.legacy_payment_records(source_table, source_id, payload)
select 'payments', id::text, to_jsonb(p) from public.payments p where provider <> 'razorpay'
on conflict do nothing;
delete from public.payments where provider <> 'razorpay';
delete from public.subscriptions where provider <> 'razorpay';

alter table public.subscriptions drop constraint if exists subscriptions_provider_check;
alter table public.subscriptions add constraint subscriptions_provider_check check (provider = 'razorpay');
alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments add constraint payments_provider_check check (provider = 'razorpay');
alter table public.payment_webhook_events drop constraint if exists payment_webhook_events_provider_check;
alter table public.payment_webhook_events add constraint payment_webhook_events_provider_check check (provider = 'razorpay');

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null,
  browser text not null,
  os text not null,
  ip_address inet,
  country text,
  city text,
  device_fingerprint text not null,
  last_active timestamptz not null default now(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  is_active boolean not null default true,
  refresh_token_hash text,
  revoked_at timestamptz,
  unique(user_id, device_fingerprint)
);
create index if not exists user_sessions_active_idx on public.user_sessions(user_id, last_active desc) where is_active;
alter table public.user_sessions enable row level security;
drop policy if exists "Users read own sessions" on public.user_sessions;
create policy "Users read own sessions" on public.user_sessions for select using (auth.uid() = user_id);

create table if not exists public.security_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.security_notifications enable row level security;
create policy "Users read own security notifications" on public.security_notifications for select using (auth.uid() = user_id);

create table if not exists public.user_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null default date_trunc('month', now())::date,
  mock_interviews_used integer not null default 0 check (mock_interviews_used >= 0),
  resume_reviews_used integer not null default 0 check (resume_reviews_used >= 0),
  tokens_used bigint not null default 0 check (tokens_used >= 0),
  last_reset timestamptz not null default now(),
  primary key(user_id, month)
);
alter table public.user_ai_usage enable row level security;
create policy "Users read own AI usage" on public.user_ai_usage for select using (auth.uid() = user_id);

create table if not exists public.ai_response_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  feature text not null check (feature in ('answer_evaluation','resume_review','mock_feedback','adaptive_follow_up','career_suggestion','admin_enrichment')),
  request_hash text not null,
  response jsonb not null,
  model text,
  tokens_used integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique(feature, request_hash)
);
create index if not exists ai_response_cache_lookup_idx on public.ai_response_cache(feature, request_hash);
alter table public.ai_response_cache enable row level security;
create policy "Users read own cached AI responses" on public.ai_response_cache for select using (auth.uid() = user_id);

alter table public.questions add column if not exists subtopic text;
alter table public.questions add column if not exists topic text;
alter table public.questions add column if not exists experience text;
alter table public.questions add column if not exists interview_round text;
alter table public.questions add column if not exists question_type text not null default 'Conceptual';
alter table public.questions add column if not exists expected_answer text;
alter table public.questions add column if not exists expected_keywords text[] not null default '{}';
alter table public.questions add column if not exists hints text[] not null default '{}';
alter table public.questions add column if not exists explanation text;
alter table public.questions add column if not exists common_mistakes text[] not null default '{}';
alter table public.questions add column if not exists follow_up_questions jsonb not null default '[]'::jsonb;
alter table public.questions add column if not exists related_question_ids uuid[] not null default '{}';
alter table public.questions add column if not exists frequency_asked integer not null default 0;
alter table public.questions add column if not exists support jsonb not null default '{}'::jsonb;
alter table public.questions add column if not exists ai_enriched_at timestamptz;
alter table public.questions drop constraint if exists questions_question_type_check;
alter table public.questions add constraint questions_question_type_check check (
  question_type in ('Conceptual','MCQ','Scenario','Hands-on','Troubleshooting','Coding','Behavioral','Architecture')
);

create or replace function public.consume_ai_credit(p_feature text, p_tokens integer default 0)
returns public.user_ai_usage
language plpgsql security definer set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_plan text;
  v_usage public.user_ai_usage;
  v_mock_limit integer;
  v_resume_limit integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_feature not in ('mock_interview','resume_review','answer_evaluation','mock_feedback','adaptive_follow_up','career_suggestion') then
    raise exception 'AI feature is not permitted';
  end if;
  select coalesce(subscription_plan::text, 'monthly') into v_plan from public.profiles where id=v_user;
  v_mock_limit := case v_plan when 'monthly' then 10 when 'half_yearly' then 50 else 100 end;
  v_resume_limit := case v_plan when 'monthly' then 1 when 'half_yearly' then 5 else 10 end;
  insert into public.user_ai_usage(user_id, month) values(v_user, date_trunc('month', now())::date)
  on conflict do nothing;
  select * into v_usage from public.user_ai_usage where user_id=v_user and month=date_trunc('month', now())::date for update;
  if p_feature='mock_interview' and v_usage.mock_interviews_used >= v_mock_limit then raise exception 'Mock interview allowance reached'; end if;
  if p_feature='resume_review' and v_usage.resume_reviews_used >= v_resume_limit then raise exception 'Resume review allowance reached'; end if;
  update public.user_ai_usage set
    mock_interviews_used = mock_interviews_used + case when p_feature='mock_interview' then 1 else 0 end,
    resume_reviews_used = resume_reviews_used + case when p_feature='resume_review' then 1 else 0 end,
    tokens_used = tokens_used + greatest(p_tokens, 0)
  where user_id=v_user and month=date_trunc('month', now())::date returning * into v_usage;
  return v_usage;
end $$;
revoke all on function public.consume_ai_credit(text, integer) from public;
grant execute on function public.consume_ai_credit(text, integer) to authenticated;

-- Prevent duplicate client subscription errors and enable the intended realtime tables.
do $$
declare t text;
begin
  foreach t in array array['user_progress','bookmarks','notes','quiz_attempts','mock_interviews']
  loop
    if to_regclass('public.' || t) is not null and not exists (
      select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
