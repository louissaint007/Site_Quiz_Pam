-- Create contest_participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS contest_participants (
  contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (contest_id, user_id)
);

-- Enable RLS
ALTER TABLE contest_participants ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can see who is in a contest (or at least the count)
DROP POLICY IF EXISTS "Participants are viewable by everyone" ON contest_participants;
CREATE POLICY "Participants are viewable by everyone"
  ON contest_participants FOR SELECT
  USING ( true );

-- Authenticated users can join contests
DROP POLICY IF EXISTS "Users can join contests" ON contest_participants;
CREATE POLICY "Users can join contests"
  ON contest_participants FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

-- Users can leave contests (optional, but good practice)
DROP POLICY IF EXISTS "Users can leave contests" ON contest_participants;
CREATE POLICY "Users can leave contests"
  ON contest_participants FOR DELETE
  USING ( auth.uid() = user_id );
