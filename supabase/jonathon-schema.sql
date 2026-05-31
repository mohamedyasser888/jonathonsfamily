-- ============================================================================
-- JONATHON APP - COMPLETE DATABASE SETUP
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT UNIQUE,
  avatar_url TEXT,
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. COLLECTIONS TABLE
-- ============================================================================
DROP TABLE IF EXISTS public.collections CASCADE;

CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collections are viewable by everyone" 
  ON public.collections FOR SELECT 
  USING (true);

CREATE POLICY "Only admin can create collections" 
  ON public.collections FOR INSERT 
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE email = 'admin'));

CREATE POLICY "Only admin can update collections" 
  ON public.collections FOR UPDATE 
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE email = 'admin'));

-- ============================================================================
-- 3. PRODUCTS TABLE
-- ============================================================================
DROP TABLE IF EXISTS public.products CASCADE;

CREATE TABLE public.products (
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

CREATE POLICY "Products are viewable by everyone" 
  ON public.products FOR SELECT 
  USING (true);

CREATE POLICY "Only admin can create products" 
  ON public.products FOR INSERT 
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE email = 'admin'));

CREATE POLICY "Only admin can update products" 
  ON public.products FOR UPDATE 
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE email = 'admin'));

-- ============================================================================
-- 4. CART TABLE
-- ============================================================================
DROP TABLE IF EXISTS public.cart CASCADE;

CREATE TABLE public.cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cart" 
  ON public.cart FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own cart" 
  ON public.cart FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart" 
  ON public.cart FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own cart" 
  ON public.cart FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. TICKETS TABLE
-- ============================================================================
DROP TABLE IF EXISTS public.tickets CASCADE;

CREATE TABLE public.tickets (
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

CREATE POLICY "Users can view their own tickets" 
  ON public.tickets FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE email = 'admin'));

CREATE POLICY "Users can create tickets" 
  ON public.tickets FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can update tickets" 
  ON public.tickets FOR UPDATE 
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE email = 'admin'));

-- ============================================================================
-- STORAGE SETUP
-- ============================================================================
-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('jonathon-images', 'jonathon-images', true)
ON CONFLICT DO NOTHING;

-- Allow public read access to images
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT 
  USING (bucket_id = 'jonathon-images');

-- Allow admin to upload images
DROP POLICY IF EXISTS "Admin can upload" ON storage.objects;
CREATE POLICY "Admin can upload" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'jonathon-images' AND auth.uid() IN (SELECT id FROM public.profiles WHERE email = 'admin'));

-- Allow admin to delete images
DROP POLICY IF EXISTS "Admin can delete" ON storage.objects;
CREATE POLICY "Admin can delete" ON storage.objects FOR DELETE 
  USING (bucket_id = 'jonathon-images' AND auth.uid() IN (SELECT id FROM public.profiles WHERE email = 'admin'));
