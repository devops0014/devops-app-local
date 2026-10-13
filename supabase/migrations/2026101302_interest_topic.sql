-- The tool a student picked on the home page ("What's your interview on?").
-- Shown to callers as "Interested in: Kubernetes". Run after 2026101301_sales_tools.sql.

alter table public.profiles add column if not exists interest_topic text
  check (interest_topic is null or interest_topic ~ '^[a-z0-9-]{1,40}$');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  topic text := lower(nullif(meta->>'interest_topic', ''));
begin
  insert into public.profiles (
    id, email, name, mobile, avatar, subscription_status, subscription_expires_at,
    utm_source, utm_medium, utm_campaign, utm_content, referrer, landing_path, interest_topic
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(meta->>'full_name', meta->>'name'),
    coalesce(meta->>'mobile', meta->>'phone'),
    coalesce(meta->>'avatar_url', meta->>'picture'),
    'active',
    null,
    left(nullif(meta->>'utm_source', ''), 100),
    left(nullif(meta->>'utm_medium', ''), 100),
    left(nullif(meta->>'utm_campaign', ''), 150),
    left(nullif(meta->>'utm_content', ''), 150),
    left(nullif(meta->>'referrer', ''), 300),
    left(nullif(meta->>'landing_path', ''), 300),
    case when topic ~ '^[a-z0-9-]{1,40}$' then topic end
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    mobile = coalesce(public.profiles.mobile, excluded.mobile),
    avatar = coalesce(public.profiles.avatar, excluded.avatar);
  return new;
end;
$$;
