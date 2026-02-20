-- 1. Drop ALL policies on profiles that might cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- 2. Recreate simple, non-recursive SELECT policy for profiles
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- 3. Ensure UPDATE policy is simple as well
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- 4. Check for any recursive policies on contests that check profiles (just dropping them to be safe if they exist as SELECT)
-- (Assuming we only read contests here. If there's an Admin policy on contests, it should be careful)
DROP POLICY IF EXISTS "Admins can view all contests" ON contests;
DROP POLICY IF EXISTS "Contests are viewable by everyone" ON contests;
CREATE POLICY "Contests are viewable by everyone" 
ON contests FOR SELECT 
USING (true);

-- 5. Force schema cache reload just in case
NOTIFY pgrst, reload_schema;
