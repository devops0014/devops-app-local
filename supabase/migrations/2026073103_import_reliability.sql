-- Corrective migration for installations that already applied 2026073102.
-- Safe to run more than once.

alter table public.mcq_questions
  add column if not exists topic text,
  add column if not exists subtopic text,
  add column if not exists experience text,
  add column if not exists interview_round text;

alter table public.general_questions
  add column if not exists topic text,
  add column if not exists subtopic text,
  add column if not exists experience text,
  add column if not exists interview_round text;

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

create index if not exists mcq_questions_import_job_idx
  on public.mcq_questions(import_job_id, import_row_number);
create index if not exists general_questions_import_job_idx
  on public.general_questions(import_job_id, import_row_number);
