-- Free access for everyone.
-- Removes the paid-subscription requirement and retires the AI mock interview.
-- Safe to run more than once. Nothing is dropped; old payment / mock data stays
-- in place (see the optional cleanup block at the bottom).

-- 1. Any signed-in user can read published, approved questions.
drop policy if exists "questions_read_subscribed" on public.questions;
drop policy if exists "questions_read_published" on public.questions;
create policy "questions_read_published"
on public.questions for select to authenticated
using (
  (is_published = true and review_status = 'approved')
  or public.is_admin()
);

-- 2. New sign-ups no longer get a 7-day trial that expires.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, mobile, avatar, subscription_status, subscription_expires_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'mobile', new.raw_user_meta_data->>'phone'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'active',
    null
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    mobile = coalesce(public.profiles.mobile, excluded.mobile),
    avatar = coalesce(public.profiles.avatar, excluded.avatar);
  return new;
end;
$$;

-- 3. Existing users: clear any expired trials / lapsed plans so nothing
--    left over can block them.
update public.profiles
set subscription_status = 'active', subscription_expires_at = null
where subscription_status <> 'active' or subscription_expires_at is not null;

-- 4. The AI mock-interview credit function is no longer used by the app.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'consume_ai_credit') then
    revoke all on function public.consume_ai_credit(text, integer) from authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- OPTIONAL CLEANUP (permanent — back up first, then uncomment to run)
-- These tables only held Razorpay payments and AI mock-interview data.
-- ---------------------------------------------------------------------------
-- drop table if exists public.payment_webhook_events;
-- drop table if exists public.subscriptions;
-- drop table if exists public.user_ai_usage;
-- drop table if exists public.mock_interviews;
-- drop function if exists public.consume_ai_credit(text, integer);
