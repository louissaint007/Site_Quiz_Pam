-- 1. Add missing columns to contest_participants to persist scores and completion status
ALTER TABLE contest_participants 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'joined' CHECK (status IN ('joined', 'completed', 'disqualified')),
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 2. Add real_name column to profiles so admins can see the true identity
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS real_name TEXT;

-- 3. Update related RLS policies if necessary
-- Allow users to update their own real_name and username in profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Allow admins to see all profiles (already implied if they have service role, but good to be explicit if using RLS for admins)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
USING (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Allow users to update their own status/score in contest_participants
DROP POLICY IF EXISTS "Users can update their participation status" ON contest_participants;
CREATE POLICY "Users can update their participation status" 
ON contest_participants FOR UPDATE 
USING (auth.uid() = user_id);
