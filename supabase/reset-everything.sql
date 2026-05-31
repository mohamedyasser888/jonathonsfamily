-- =============================================================================
-- STEP 1 — EMPTY THE DATABASE (Jonathon Store)
-- Supabase → SQL Editor → paste → Run
-- Then run fresh-start.sql (step 2)
-- =============================================================================

-- Store data
truncate table public.tickets restart identity cascade;
truncate table public.cart restart identity cascade;
truncate table public.products restart identity cascade;
truncate table public.collections restart identity cascade;

-- Storage: Supabase does NOT allow DELETE on storage.objects via SQL.
-- After this script succeeds, run in your project folder:
--   npm run clear:storage
-- Or delete files manually: Dashboard → Storage → jonathon-images / profile-photos

-- All sign-ups / profiles
delete from public.profiles;
delete from auth.identities;
delete from auth.users;

-- Done. Run supabase/fresh-start.sql next.
