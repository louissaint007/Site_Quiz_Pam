-- fix_profiles_insert_policy.sql

-- Drop the policy if it already exists to avoid errors
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create the missing INSERT policy
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Force schema reload to apply policies instantly
NOTIFY pgrst, reload_schema;
