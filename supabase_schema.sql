
-- --- UPDATED SUPABASE SCHEMA FOR OFFLINE-FIRST QUIZPAM ---

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  balance_htg DECIMAL DEFAULT 0,
  solo_level INTEGER DEFAULT 1,
  honorary_title TEXT DEFAULT 'Novice',
  total_wins INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_balance DECIMAL DEFAULT 0,
  total_deposited DECIMAL DEFAULT 0,
  total_withdrawn DECIMAL DEFAULT 0,
  total_won DECIMAL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, 
  correct_index INTEGER NOT NULL,
  is_for_contest BOOLEAN DEFAULT true,
  is_for_solo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Solo Progress (Anti-Repetition logic)
CREATE TABLE IF NOT EXISTS user_solo_progress (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  is_correct BOOLEAN DEFAULT false,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);

-- Game Sessions (Updated for pack management)
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  contest_id UUID REFERENCES contests(id) ON DELETE CASCADE, -- NULL for solo
  questions_ids UUID[] NOT NULL,
  current_index INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contests table
CREATE TABLE IF NOT EXISTS contests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category_filter TEXT, 
  entry_fee_htg DECIMAL DEFAULT 250,
  min_participants INTEGER DEFAULT 1000,
  current_participants INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  admin_margin_percent DECIMAL DEFAULT 50,
  grand_prize DECIMAL DEFAULT 0,
  first_prize_percent DECIMAL DEFAULT 20,
  second_prize_percent DECIMAL DEFAULT 8,
  third_prize_percent DECIMAL DEFAULT 2,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
