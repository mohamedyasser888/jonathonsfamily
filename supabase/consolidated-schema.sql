-- ============================================================================
-- JONATHON APP - CONSOLIDATED DATABASE SCHEMA
-- Run this in Supabase SQL Editor to set up the complete database
-- This consolidates all schema files into one idempotent script
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT NOT NULL,
            username TEXT UNIQUE,
            avatar_url TEXT,
            password TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- Add columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create trigger for auto-creating profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO UPDATE SET email = excluded.email;
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. COLLECTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published BOOLEAN NOT NULL DEFAULT true,
    availability_status TEXT NOT NULL DEFAULT 'normal'
);

-- Add columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collections' AND column_name = 'images') THEN
        ALTER TABLE public.collections ADD COLUMN images JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collections' AND column_name = 'published') THEN
        ALTER TABLE public.collections ADD COLUMN published BOOLEAN NOT NULL DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collections' AND column_name = 'availability_status') THEN
        ALTER TABLE public.collections ADD COLUMN availability_status TEXT NOT NULL DEFAULT 'normal';
    END IF;
END $$;

-- Add constraint for availability_status
ALTER TABLE public.collections
  DROP CONSTRAINT IF EXISTS collections_availability_status_check;

ALTER TABLE public.collections
  ADD CONSTRAINT collections_availability_status_check
  CHECK (availability_status IN ('normal', 'leaving_soon', 'left'));

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collections are viewable by everyone" ON public.collections;
DROP POLICY IF EXISTS "Published collections are public" ON public.collections;

CREATE POLICY "Published collections are public"
  ON public.collections FOR SELECT
  USING (published = true);

DROP POLICY IF EXISTS "Only admin can create collections" ON public.collections;
CREATE POLICY "Only admin can create collections" 
  ON public.collections FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Only admin can update collections" ON public.collections;
CREATE POLICY "Only admin can update collections" 
  ON public.collections FOR UPDATE 
  USING (true);

-- ============================================================================
-- 3. PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    price DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products are viewable by everyone" 
  ON public.products FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Only admin can create products" ON public.products;
CREATE POLICY "Only admin can create products" 
  ON public.products FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Only admin can update products" ON public.products;
CREATE POLICY "Only admin can update products" 
  ON public.products FOR UPDATE 
  USING (true);

-- ============================================================================
-- 4. CART TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own cart" ON public.cart;
CREATE POLICY "Users can view their own cart" 
  ON public.cart FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to their own cart" ON public.cart;
CREATE POLICY "Users can add to their own cart" 
  ON public.cart FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own cart" ON public.cart;
CREATE POLICY "Users can update their own cart" 
  ON public.cart FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete from their own cart" ON public.cart;
CREATE POLICY "Users can delete from their own cart" 
  ON public.cart FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. TICKETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    items JSONB NOT NULL,
    total_items INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
CREATE POLICY "Users can view their own tickets" 
  ON public.tickets FOR SELECT 
  USING (auth.uid() = user_id OR true);

DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
CREATE POLICY "Users can create tickets" 
  ON public.tickets FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can update tickets" ON public.tickets;
CREATE POLICY "Admin can update tickets" 
  ON public.tickets FOR UPDATE 
  USING (true);

-- Enable realtime for tickets (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
  END IF;
END $$;

-- ============================================================================
-- 6. MESSAGES TABLE (with proper UUID types)
-- ============================================================================
DROP TABLE IF EXISTS public.messages CASCADE;

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID,
    receiver_id UUID,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
CREATE POLICY "Users can view their messages" 
  ON public.messages FOR SELECT 
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
CREATE POLICY "Users can insert messages" 
  ON public.messages FOR INSERT 
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Admin can insert messages" ON public.messages;
CREATE POLICY "Admin can insert messages" 
  ON public.messages FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Messages can be updated" ON public.messages;
CREATE POLICY "Messages can be updated" 
  ON public.messages FOR UPDATE 
  USING (true);

-- Enable realtime for messages (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- ============================================================================
-- 7. USER PRESENCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_presence (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    avatar_url TEXT,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Presence is viewable by everyone" ON public.user_presence;
CREATE POLICY "Presence is viewable by everyone" 
  ON public.user_presence FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can update their presence" ON public.user_presence;
CREATE POLICY "Users can update their presence" 
  ON public.user_presence FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their presence" ON public.user_presence;
CREATE POLICY "Users can insert their presence" 
  ON public.user_presence FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for user_presence (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
  END IF;
END $$;

-- ============================================================================
-- 8. STORAGE BUCKETS
-- ============================================================================

-- Create profile-photos bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT DO NOTHING;

-- Create jonathon-images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('jonathon-images', 'jonathon-images', true)
ON CONFLICT DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT 
  USING (bucket_id = 'profile-photos' OR bucket_id = 'jonathon-images');

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
CREATE POLICY "Users can update own photos" ON storage.objects FOR UPDATE 
  USING (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE 
  USING (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin can upload jonathon-images" ON storage.objects;
CREATE POLICY "Admin can upload jonathon-images" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'jonathon-images');

DROP POLICY IF EXISTS "Admin can update jonathon-images" ON storage.objects;
CREATE POLICY "Admin can update jonathon-images" ON storage.objects FOR UPDATE 
  USING (bucket_id = 'jonathon-images');

DROP POLICY IF EXISTS "Admin can delete jonathon-images" ON storage.objects;
CREATE POLICY "Admin can delete jonathon-images" ON storage.objects FOR DELETE 
  USING (bucket_id = 'jonathon-images');

-- ============================================================================
-- 9. GRANT PRIVILEGES
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
