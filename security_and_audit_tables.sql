-- SECURITY FIXES & AUDIT LOG TABLE

-- 1. Create user_activities table
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_activities
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Users can insert their own activities
CREATE POLICY "Users can insert own activities" 
ON user_activities FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can view their own activities (optional, but good)
CREATE POLICY "Users can view own activities" 
ON user_activities FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all activities
CREATE POLICY "Admins can view all activities" 
ON user_activities FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);

-- 2. Security Fixes for existing tables

-- ENABLE RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_solo_progress ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR TRANSACTIONS
-- Users can only view their own transactions
CREATE POLICY "Users can view own transactions" 
ON transactions FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert pending transactions
CREATE POLICY "Users can insert pending transactions" 
ON transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions" 
ON transactions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admins can insert/update any transaction
CREATE POLICY "Admins can insert transactions" 
ON transactions FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can update transactions" 
ON transactions FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);

-- POLICIES FOR GAME SESSIONS
-- Users can view own sessions
CREATE POLICY "Users can view own game sessions" 
ON game_sessions FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert own sessions
CREATE POLICY "Users can insert own game sessions" 
ON game_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update own sessions
CREATE POLICY "Users can update own game sessions" 
ON game_sessions FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all game sessions" 
ON game_sessions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);

-- POLICIES FOR USER SOLO PROGRESS
-- Users can view own progress
CREATE POLICY "Users can view own solo progress" 
ON user_solo_progress FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert own progress
CREATE POLICY "Users can insert own solo progress" 
ON user_solo_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update own progress
CREATE POLICY "Users can update own solo progress" 
ON user_solo_progress FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can view all progress
CREATE POLICY "Admins can view all solo progress" 
ON user_solo_progress FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);
