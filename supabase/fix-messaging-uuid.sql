-- ============================================================================
-- FIX MESSAGING TABLE UUID MISMATCH
-- Run this in Supabase SQL Editor to fix TEXT vs UUID mismatch
-- ============================================================================

-- Drop the existing messages table and recreate with proper UUID types
DROP TABLE IF EXISTS public.messages CASCADE;

-- Recreate messages table with UUID types for sender_id and receiver_id
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID, -- Can be NULL for admin messages
    receiver_id UUID, -- Can be NULL for admin messages
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Admin can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Messages can be updated" ON public.messages;

-- Create proper RLS policies
CREATE POLICY "Users can view their messages"
  ON public.messages FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Admin can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Messages can be updated"
  ON public.messages FOR UPDATE
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated, anon, service_role;
