-- Production admin content pipeline.
-- Apply after 2026072901_admin_question_management.sql.

create extension if not exists "pgcrypto";

alter table public.questions add column if not exists source_hash text;
alter table public.questions add column if not exists import_job_id uuid references public.ai_processing_jobs(id) on delete set null;
alter table public.questions add column if not exists import_row_number integer;
alter table public.questions add column if not exists enrichment_status text not null default 'ready';
alter table public.questions drop constraint if exists questions_enrichment_status_check;
alter table public.questions add constraint questions_enrichment_status_check
  check (enrichment_status in ('queued','processing','ready','failed'));

create unique index if not exists questions_source_hash_unique
  on public.questions(source_hash) where source_hash is not null;
create index if not exists questions_review_queue_idx
  on public.questions(review_status, enrichment_status, created_at desc);
create index if not exists questions_import_job_idx
  on public.questions(import_job_id, import_row_number);

alter table public.content_uploads
  add column if not exists invalid_count integer not null default 0,
  add column if not exists duplicate_count integer not null default 0;

alter table public.activity_logs add column if not exists request_id text;

drop policy if exists "profiles_admin_read" on public.profiles;
create policy "profiles_admin_read"
on public.profiles for select to authenticated
using (auth.uid() = id or public.is_admin());

drop policy if exists "subscriptions_admin_read" on public.subscriptions;
create policy "subscriptions_admin_read"
on public.subscriptions for select to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "activity_logs_admin_read" on public.activity_logs;
create policy "activity_logs_admin_read"
on public.activity_logs for select to authenticated
using (public.is_admin());

drop policy if exists "activity_logs_admin_insert" on public.activity_logs;
create policy "activity_logs_admin_insert"
on public.activity_logs for insert to authenticated
with check (public.is_admin() and actor_id = auth.uid());

drop policy if exists "questions_admin_all" on public.questions;
create policy "questions_admin_all"
on public.questions for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Only approved and published questions are visible to students.
drop policy if exists "questions_read_subscribed" on public.questions;
create policy "questions_read_subscribed"
on public.questions for select to authenticated
using (
  (
    is_published = true
    and review_status = 'approved'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.subscription_status in ('trialing','active')
        and (p.subscription_expires_at is null or p.subscription_expires_at > now())
    )
  )
  or public.is_admin()
);

-- Storage bucket used to retain the exact original imports.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-imports',
  'question-imports',
  false,
  10485760,
  array['text/csv','application/json','text/plain']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "question_imports_admin_insert" on storage.objects;
create policy "question_imports_admin_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'question-imports' and public.is_admin());

drop policy if exists "question_imports_admin_read" on storage.objects;
create policy "question_imports_admin_read"
on storage.objects for select to authenticated
using (bucket_id = 'question-imports' and public.is_admin());

drop policy if exists "question_imports_admin_delete" on storage.objects;
create policy "question_imports_admin_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'question-imports' and public.is_admin());
