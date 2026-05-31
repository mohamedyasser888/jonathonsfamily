-- =============================================================================
-- STEP 2 — RECREATE POLICIES & FIX TICKETS (run AFTER reset-everything.sql)
-- Supabase → SQL Editor → Run
-- Then: Dashboard → Database → Replication → ON for collections, products, tickets
-- Optional: npm run clear:storage  (empties image buckets via Storage API)
-- Add SUPABASE_SERVICE_ROLE_KEY to jonathons/.env.local and restart npm run dev
-- =============================================================================

-- ----- PROFILES -----
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  password text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles disable row level security;
grant all on public.profiles to anon, authenticated, service_role;

-- ----- COLLECTIONS -----
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  images jsonb default '[]'::jsonb,
  published boolean not null default true,
  availability_status text not null default 'normal'
    check (availability_status in ('normal', 'leaving_soon', 'left')),
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.collections enable row level security;
drop policy if exists "Collections are viewable by everyone" on public.collections;
drop policy if exists "Published collections are public" on public.collections;
create policy "Published collections are public"
  on public.collections for select using (published = true);

-- ----- PRODUCTS -----
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  name text not null,
  description text,
  image_url text not null,
    price text not null default 'k',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.products enable row level security;
drop policy if exists "Products are viewable by everyone" on public.products;
create policy "Products are viewable by everyone"
  on public.products for select using (true);

-- ----- CART -----
create table if not exists public.cart (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer default 1,
  added_at timestamptz default now(),
  unique (user_id, product_id)
);

alter table public.cart enable row level security;
drop policy if exists "Users can view their own cart" on public.cart;
drop policy if exists "Users can add to their own cart" on public.cart;
drop policy if exists "Users can update their own cart" on public.cart;
drop policy if exists "Users can delete from their own cart" on public.cart;

create policy "Users can view their own cart"
  on public.cart for select using (auth.uid() = user_id);
create policy "Users can add to their own cart"
  on public.cart for insert with check (auth.uid() = user_id);
create policy "Users can update their own cart"
  on public.cart for update using (auth.uid() = user_id);
create policy "Users can delete from their own cart"
  on public.cart for delete using (auth.uid() = user_id);

-- ----- TICKETS -----
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  items jsonb not null,
  total_items integer not null,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tickets enable row level security;

-- Remove old / conflicting policies
drop policy if exists "Users can view their own tickets" on public.tickets;
drop policy if exists "Users can create tickets" on public.tickets;
drop policy if exists "Users can update their own tickets" on public.tickets;
drop policy if exists "Admin can update tickets" on public.tickets;

create policy "Users can view their own tickets"
  on public.tickets for select using (auth.uid() = user_id);

create policy "Users can create tickets"
  on public.tickets for insert with check (auth.uid() = user_id);

create policy "Users can update their own tickets"
  on public.tickets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.tickets to authenticated;
grant all on public.tickets to service_role;

grant select on public.collections to anon, authenticated;
grant select on public.products to anon, authenticated;
grant all on public.collections to service_role;
grant all on public.products to service_role;
grant all on public.cart to authenticated, service_role;

-- ----- STORAGE -----
insert into storage.buckets (id, name, public)
values ('jonathon-images', 'jonathon-images', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read jonathon-images" on storage.objects;
create policy "Public read jonathon-images"
  on storage.objects for select
  using (bucket_id in ('jonathon-images', 'profile-photos'));

drop policy if exists "Authenticated upload jonathon-images" on storage.objects;
create policy "Authenticated upload jonathon-images"
  on storage.objects for insert
  with check (bucket_id = 'jonathon-images');

drop policy if exists "Service role full storage" on storage.objects;
create policy "Service role full storage"
  on storage.objects for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ----- REALTIME -----
do $$ begin
  alter publication supabase_realtime add table public.collections;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.tickets;
exception when duplicate_object then null;
end $$;

grant usage on schema public to anon, authenticated, service_role;
