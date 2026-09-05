-- v44: add the GitHub category used by question-bank imports.
-- Safe to run more than once.

insert into public.categories (name, slug, icon, color, sort_order)
values ('GitHub', 'github', 'Github', '#a1a1aa', 3)
on conflict (slug) do update
set name = excluded.name,
    icon = excluded.icon,
    color = excluded.color;
