-- Migration for Manual Payments and Chat System

-- 1. Create user_payment_info table
CREATE TABLE IF NOT EXISTS user_payment_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for user_payment_info
ALTER TABLE user_payment_info ENABLE ROW LEVEL SECURITY;

-- Policies for user_payment_info
-- Users can read their own
CREATE POLICY "Users can view their own payment info" 
ON user_payment_info FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own
CREATE POLICY "Users can insert their own payment info" 
ON user_payment_info FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own
CREATE POLICY "Users can update their own payment info" 
ON user_payment_info FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can do anything
CREATE POLICY "Admins have full access to user_payment_info" 
ON user_payment_info FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);

-- 2. Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat_messages
-- Users can read messages in their conversation
CREATE POLICY "Users can view their own chat messages" 
ON chat_messages FOR SELECT 
USING (auth.uid() = conversation_user_id);

-- Users can send messages to their conversation
CREATE POLICY "Users can insert their own chat messages" 
ON chat_messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id AND auth.uid() = conversation_user_id);

-- Admins can read all messages
CREATE POLICY "Admins can view all chat messages" 
ON chat_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admins can send messages
CREATE POLICY "Admins can insert any chat messages" 
ON chat_messages FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admins can update messages (to mark as read)
CREATE POLICY "Admins can update all chat messages" 
ON chat_messages FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);

-- Allow user to update their own messages as read? No, only receiver updates is_read.
CREATE POLICY "Users can update their own received messages" 
ON chat_messages FOR UPDATE 
USING (
  auth.uid() = conversation_user_id AND 
  sender_id != auth.uid()
);

-- Publish chat_messages to realtime
-- We need to make sure the app can subscribe to updates
-- This is done in supabase dashboard or via SQL:
BEGIN;
  -- Remove the table from publication if it exists to avoid errors
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS chat_messages;
  -- Add the table to publication
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
COMMIT;
