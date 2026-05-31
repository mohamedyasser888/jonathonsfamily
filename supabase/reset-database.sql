-- ============================================================================
-- JONATHON APP - COMPLETE DATABASE RESET
-- Run this in Supabase SQL Editor to completely reset the database
-- WARNING: This will DELETE ALL DATA
-- ============================================================================

-- Drop all tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS public.cart CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.user_presence CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.collections CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remove tables from realtime publication (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tickets') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.tickets;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_presence') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.user_presence;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if tables aren't in publication
  NULL;
END $$;

-- ============================================================================
-- NOW RUN THE CONSOLIDATED SCHEMA
-- After this script completes, run: supabase/consolidated-schema.sql
-- ============================================================================
