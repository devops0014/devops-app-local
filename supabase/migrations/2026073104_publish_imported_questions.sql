-- v43: Release valid imported content that was stranded in Draft.
-- Safe to run more than once.

update public.mcq_questions
set
  is_published = true,
  review_status = 'approved',
  enrichment_status = 'ready',
  updated_at = now()
where is_published = false
  and review_status = 'pending'
  and question_text is not null
  and length(trim(question_text)) >= 10
  and answer_text is not null
  and length(trim(answer_text)) >= 1
  and jsonb_typeof(options) = 'array'
  and jsonb_array_length(options) >= 2
  and correct_option >= 0
  and correct_option < jsonb_array_length(options);

update public.general_questions
set
  is_published = true,
  review_status = 'approved',
  enrichment_status = 'ready',
  updated_at = now()
where is_published = false
  and review_status = 'pending'
  and question_text is not null
  and length(trim(question_text)) >= 10
  and answer_text is not null
  and length(trim(answer_text)) >= 1;

update public.ai_processing_jobs job
set
  status = 'completed',
  stage = 'published',
  progress = 100,
  completed_at = coalesce(job.completed_at, now()),
  error_message = null
where not exists (
  select 1 from public.mcq_questions q
  where q.import_job_id = job.id and q.is_published = false
)
and not exists (
  select 1 from public.general_questions q
  where q.import_job_id = job.id and q.is_published = false
)
and exists (
  select 1 from public.mcq_questions q where q.import_job_id = job.id
  union all
  select 1 from public.general_questions q where q.import_job_id = job.id
);

update public.content_uploads upload
set status = 'completed'
where exists (
  select 1 from public.ai_processing_jobs job
  where job.upload_id = upload.id and job.status = 'completed'
);
