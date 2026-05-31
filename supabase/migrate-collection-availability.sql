-- Run in Supabase SQL Editor (after fresh-start / published migration)
-- Green dot = normal, yellow = leaving soon, red = collection left (extra fees possible)

alter table public.collections
  add column if not exists availability_status text not null default 'normal';

alter table public.collections
  drop constraint if exists collections_availability_status_check;

alter table public.collections
  add constraint collections_availability_status_check
  check (availability_status in ('normal', 'leaving_soon', 'left'));

comment on column public.collections.availability_status is
  'Store indicator: normal (green), leaving_soon (yellow), left (red)';
