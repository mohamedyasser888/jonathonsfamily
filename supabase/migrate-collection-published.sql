-- Run once in Supabase SQL Editor
-- Framed collections stay hidden until admin publishes them.

alter table public.collections
  add column if not exists published boolean not null default true;

drop policy if exists "Collections are viewable by everyone" on public.collections;
drop policy if exists "Published collections are public" on public.collections;

create policy "Published collections are public"
  on public.collections for select
  using (published = true);
