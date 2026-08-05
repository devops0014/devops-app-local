-- Phase 7: authoritative XP, streaks, challenges and leaderboards.
alter table public.profiles
  add column if not exists best_streak integer not null default 0,
  add column if not exists last_activity_date date;

alter table public.xp_events
  add column if not exists event_key text;
create unique index if not exists xp_events_user_event_key_idx
  on public.xp_events(user_id, event_key)
  where event_key is not null;

create table if not exists public.daily_activity (
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null default current_date,
  xp_earned integer not null default 0,
  questions_mastered integer not null default 0,
  quizzes_completed integer not null default 0,
  flashcards_reviewed integer not null default 0,
  mocks_completed integer not null default 0,
  primary key (user_id, activity_date)
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  cadence text not null check (cadence in ('daily', 'weekly')),
  metric text not null check (metric in ('xp', 'questions', 'quizzes', 'flashcards', 'mocks')),
  target integer not null check (target > 0),
  xp_reward integer not null default 0 check (xp_reward >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true
);

create table if not exists public.user_challenge_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  progress integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  reward_claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, challenge_id)
);

alter table public.daily_activity enable row level security;
alter table public.challenges enable row level security;
alter table public.user_challenge_progress enable row level security;
create policy "daily_activity_own_read" on public.daily_activity for select to authenticated using (auth.uid() = user_id);
create policy "challenges_authenticated_read" on public.challenges for select to authenticated using (is_active);
create policy "challenge_progress_own_read" on public.user_challenge_progress for select to authenticated using (auth.uid() = user_id);

insert into public.badges (slug, name, description, icon, rarity, xp_reward, criteria)
values
  ('first-master', 'First Deployment', 'Master your first interview question.', 'rocket', 'common', 50, '{"questions":1}'),
  ('quiz-sharpshooter', 'Sharp Shooter', 'Score at least 90% in a quiz.', 'target', 'rare', 150, '{"quiz_accuracy":90}'),
  ('streak-seven', 'Seven Day Uptime', 'Maintain a seven-day learning streak.', 'flame', 'rare', 200, '{"streak":7}'),
  ('streak-thirty', 'Always On', 'Maintain a thirty-day learning streak.', 'zap', 'epic', 500, '{"streak":30}'),
  ('xp-7500', 'Platform Engineer', 'Earn 7,500 total XP.', 'shield', 'epic', 300, '{"xp":7500}'),
  ('mock-ace', 'Interview Ace', 'Score at least 85 in a mock interview.', 'trophy', 'legendary', 500, '{"mock_score":85}')
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, icon = excluded.icon,
  rarity = excluded.rarity, xp_reward = excluded.xp_reward, criteria = excluded.criteria;

insert into public.challenges (slug, name, description, cadence, metric, target, xp_reward, starts_at, ends_at)
values
  ('daily-50-xp', 'Daily Momentum', 'Earn 50 XP today.', 'daily', 'xp', 50, 50, date_trunc('day', now()), date_trunc('day', now()) + interval '1 day'),
  ('weekly-quiz-three', 'Quiz Operator', 'Complete three quizzes this week.', 'weekly', 'quizzes', 3, 250, date_trunc('week', now()), date_trunc('week', now()) + interval '1 week'),
  ('weekly-master-ten', 'Mastery Sprint', 'Master ten questions this week.', 'weekly', 'questions', 10, 300, date_trunc('week', now()), date_trunc('week', now()) + interval '1 week')
on conflict (slug) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at, is_active = true;

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
  if p_amount < 0 or p_amount > 1000 then
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

  v_profile.streak := case
    when v_profile.last_activity_date = current_date then v_profile.streak
    when v_profile.last_activity_date = current_date - 1 then v_profile.streak + 1
    else 1
  end;
  v_profile.xp := v_profile.xp + p_amount;
  v_level := case
    when v_profile.xp >= 16000 then 8 when v_profile.xp >= 11000 then 7
    when v_profile.xp >= 7500 then 6 when v_profile.xp >= 4500 then 5
    when v_profile.xp >= 2500 then 4 when v_profile.xp >= 1250 then 3
    when v_profile.xp >= 500 then 2 else 1 end;

  update public.profiles set
    xp = v_profile.xp,
    level = v_level,
    streak = v_profile.streak,
    best_streak = greatest(best_streak, v_profile.streak),
    last_activity_date = current_date,
    updated_at = now()
  where id = p_user_id
  returning * into v_profile;

  insert into public.daily_activity (
    user_id, activity_date, xp_earned, questions_mastered,
    quizzes_completed, flashcards_reviewed, mocks_completed
  ) values (
    p_user_id, current_date, p_amount,
    case when p_event_type = 'question_mastered' then 1 else 0 end,
    case when p_event_type = 'quiz_completed' then 1 else 0 end,
    case when p_event_type like 'flashcard_%' then 1 else 0 end,
    case when p_event_type = 'mock_completed' then 1 else 0 end
  )
  on conflict (user_id, activity_date) do update set
    xp_earned = daily_activity.xp_earned + excluded.xp_earned,
    questions_mastered = daily_activity.questions_mastered + excluded.questions_mastered,
    quizzes_completed = daily_activity.quizzes_completed + excluded.quizzes_completed,
    flashcards_reviewed = daily_activity.flashcards_reviewed + excluded.flashcards_reviewed,
    mocks_completed = daily_activity.mocks_completed + excluded.mocks_completed;

  insert into public.user_challenge_progress (user_id, challenge_id, progress, completed_at)
  select p_user_id, c.id,
    case c.metric
      when 'xp' then p_amount
      when 'questions' then case when p_event_type = 'question_mastered' then 1 else 0 end
      when 'quizzes' then case when p_event_type = 'quiz_completed' then 1 else 0 end
      when 'flashcards' then case when p_event_type like 'flashcard_%' then 1 else 0 end
      when 'mocks' then case when p_event_type = 'mock_completed' then 1 else 0 end
    end,
    null
  from public.challenges c
  where c.is_active and now() between c.starts_at and c.ends_at
  on conflict (user_id, challenge_id) do update set
    progress = user_challenge_progress.progress + excluded.progress,
    completed_at = case
      when user_challenge_progress.progress + excluded.progress >=
        (select target from public.challenges where id = excluded.challenge_id)
      then coalesce(user_challenge_progress.completed_at, now())
      else user_challenge_progress.completed_at end,
    updated_at = now();

  return jsonb_build_object('duplicate', false, 'xp', v_profile.xp, 'level', v_profile.level, 'streak', v_profile.streak, 'bestStreak', v_profile.best_streak);
end;
$$;

revoke all on function public.award_gamification_event(uuid, text, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.award_gamification_event(uuid, text, text, integer, jsonb) to service_role;
