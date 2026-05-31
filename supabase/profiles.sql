-- profiles table for Jonathon Store
-- id, email, username, password, avatar_url (picture link)

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

drop table if exists public.profiles;

create table public.profiles (
  id uuid primary key,
  email text,
  username text,
  password text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on column public.profiles.avatar_url is 'Profile picture URL (link)';
comment on column public.profiles.password is 'Stored for app profile record; login still uses Supabase Auth';

alter table public.profiles disable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant all on public.profiles to anon, authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
