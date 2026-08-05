-- Live admin question management and profile mobile capture.
-- Safe to run more than once.

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
    'trialing',
    now() + interval '7 days'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    mobile = coalesce(public.profiles.mobile, excluded.mobile),
    avatar = coalesce(public.profiles.avatar, excluded.avatar);
  return new;
end;
$$;

drop policy if exists "questions_admin_all" on public.questions;
create policy "questions_admin_all"
on public.questions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "categories_admin_all" on public.categories;
create policy "categories_admin_all"
on public.categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
