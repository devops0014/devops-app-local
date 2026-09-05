-- Account profile fields and revised AI allowances.
-- Safe to run more than once.

alter table public.profiles
  add column if not exists mobile text;

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
  v_mock_limit := case v_plan when 'monthly' then 2 when 'half_yearly' then 15 else 100 end;
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
