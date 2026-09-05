-- Makes XP transactional, idempotent, and capable of reversing incorrectly
-- claimed mastery. Apply after 2026072703_phase7_gamification.sql.
create or replace function public.award_gamification_event(
  p_user_id uuid,
  p_event_type text,
  p_event_key text,
  p_amount integer,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_inserted integer := 0;
  v_level integer;
begin
  if p_amount < -1000 or p_amount > 1000 then
    raise exception 'invalid XP amount';
  end if;

  insert into public.xp_events (user_id, amount, source, event_key, metadata)
  values (p_user_id, p_amount, p_event_type, p_event_key, p_metadata)
  on conflict (user_id, event_key) where event_key is not null do nothing;
  get diagnostics v_inserted = row_count;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if v_inserted = 0 then
    return jsonb_build_object('duplicate', true, 'xp', v_profile.xp, 'level', v_profile.level, 'streak', v_profile.streak, 'bestStreak', v_profile.best_streak);
  end if;

  if p_amount > 0 then
    v_profile.streak := case
      when v_profile.last_activity_date = current_date then v_profile.streak
      when v_profile.last_activity_date = current_date - 1 then v_profile.streak + 1
      else 1 end;
  end if;
  v_profile.xp := greatest(0, v_profile.xp + p_amount);
  v_level := case
    when v_profile.xp >= 16000 then 8 when v_profile.xp >= 11000 then 7
    when v_profile.xp >= 7500 then 6 when v_profile.xp >= 4500 then 5
    when v_profile.xp >= 2500 then 4 when v_profile.xp >= 1250 then 3
    when v_profile.xp >= 500 then 2 else 1 end;

  update public.profiles set xp = v_profile.xp, level = v_level,
    streak = v_profile.streak, best_streak = greatest(best_streak, v_profile.streak),
    last_activity_date = case when p_amount > 0 then current_date else last_activity_date end,
    updated_at = now()
  where id = p_user_id returning * into v_profile;

  insert into public.daily_activity (
    user_id, activity_date, xp_earned, questions_mastered,
    quizzes_completed, flashcards_reviewed, mocks_completed
  ) values (
    p_user_id, current_date, p_amount,
    case when p_event_type = 'question_mastered' then 1 when p_event_type = 'question_unmastered' then -1 else 0 end,
    case when p_event_type = 'quiz_completed' then 1 else 0 end,
    case when p_event_type like 'flashcard_%' then 1 else 0 end,
    case when p_event_type = 'mock_completed' then 1 else 0 end
  )
  on conflict (user_id, activity_date) do update set
    xp_earned = daily_activity.xp_earned + excluded.xp_earned,
    questions_mastered = greatest(0, daily_activity.questions_mastered + excluded.questions_mastered),
    quizzes_completed = daily_activity.quizzes_completed + excluded.quizzes_completed,
    flashcards_reviewed = daily_activity.flashcards_reviewed + excluded.flashcards_reviewed,
    mocks_completed = daily_activity.mocks_completed + excluded.mocks_completed;

  return jsonb_build_object('duplicate', false, 'xp', v_profile.xp, 'level', v_profile.level, 'streak', v_profile.streak, 'bestStreak', v_profile.best_streak);
end;
$$;

revoke all on function public.award_gamification_event(uuid, text, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.award_gamification_event(uuid, text, text, integer, jsonb) to service_role;
