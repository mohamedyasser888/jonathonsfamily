-- Run once in Supabase SQL Editor (after fresh-start)
-- Stores product prices as text: numbers or magical letters k, s, g

alter table public.products
  alter column price type text using price::text;

alter table public.products
  alter column price set default 'k';
