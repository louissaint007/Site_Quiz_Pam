
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
  xp BIGINT DEFAULT 0,
  level INTEGER DEFAULT 1,
  last_level_notified INTEGER DEFAULT 1,
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
  entry_fee DECIMAL DEFAULT 250,
  min_participants INTEGER DEFAULT 10,
  max_participants INTEGER DEFAULT 1000,
  current_participants INTEGER DEFAULT 0,
  question_count INTEGER DEFAULT 10,
  status TEXT DEFAULT 'pending',
  admin_margin_percent DECIMAL DEFAULT 50,
  grand_prize DECIMAL DEFAULT 0,
  prize_type TEXT DEFAULT 'cash',
  prize_image_url TEXT,
  prize_description TEXT,
  media_type TEXT DEFAULT 'image',
  first_prize_percent DECIMAL DEFAULT 20,
  second_prize_percent DECIMAL DEFAULT 8,
  third_prize_percent DECIMAL DEFAULT 2,
  image_url TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT NOT NULL DEFAULT gen_random_uuid (),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  type TEXT CHECK (type IN ('deposit', 'withdrawal', 'entry_fee', 'prize')),
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  metadata JSONB,
  payment_method TEXT,
  PRIMARY KEY (id),
  UNIQUE (id)
);

-- Trigger function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- We only update for completed transactions
  IF (NEW.status = 'completed') THEN
    IF (NEW.type = 'deposit' OR NEW.type = 'prize') THEN
      UPDATE wallets 
      SET total_balance = total_balance + NEW.amount,
          total_deposited = CASE WHEN NEW.type = 'deposit' THEN total_deposited + NEW.amount ELSE total_deposited END,
          total_won = CASE WHEN NEW.type = 'prize' THEN total_won + NEW.amount ELSE total_won END,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;

      -- Also update profile balance for redundancy (if used in UI)
      UPDATE profiles
      SET balance_htg = balance_htg + NEW.amount
      WHERE id = NEW.user_id;
      
    ELSIF (NEW.type = 'withdrawal' OR NEW.type = 'entry_fee') THEN
      UPDATE wallets 
      SET total_balance = total_balance - NEW.amount,
          total_withdrawn = CASE WHEN NEW.type = 'withdrawal' THEN total_withdrawn + NEW.amount ELSE total_withdrawn END,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;

      -- Update profile balance
      UPDATE profiles
      SET balance_htg = balance_htg - NEW.amount
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update wallet on transaction insert/update
CREATE TRIGGER trigger_update_wallet
AFTER INSERT OR UPDATE OF status ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance();

-- Levels Configuration Table
CREATE TABLE IF NOT EXISTS levels_config (
  level INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  min_xp BIGINT NOT NULL
);

-- Seed Levels Data (Example titles, actual XP from formula)
-- Level 1-10: Novice to Konnen Toupatou
INSERT INTO levels_config (level, title, min_xp) VALUES
(1, 'Novice', 0),
(2, 'Debutan', 100),
(3, 'Apranti', 300),
(4, 'Etidyan', 600),
(5, 'Konnen', 1000),
(6, 'Debouye', 1500),
(7, 'Eklere', 2100),
(8, 'Save', 2800),
(9, 'Konesè', 3600),
(10, 'Konnen Toupatou', 4500),
-- Level 11-25: As to Mèt Quiz
(11, 'As', 5500),
(15, 'Eksperyante', 12000),
(20, 'Gwo Toro', 25000),
(25, 'Mèt Quiz', 50000),
-- Level 26-40: Sajès to Mèt Inivèsèl
(26, 'Sajès', 60000),
(30, 'Filozòf', 100000),
(35, 'Inivèsitè', 150000),
(40, 'Mèt Inivèsèl', 210000),
-- Level 41-49: Doyen
(41, 'Doyen', 230000),
(45, 'Gran Doyen', 300000),
-- Level 50: Lajand
(50, 'Lajand', 400000)
ON CONFLICT (level) DO UPDATE SET title = EXCLUDED.title, min_xp = EXCLUDED.min_xp;
