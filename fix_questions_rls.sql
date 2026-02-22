-- Fix RLS Policies for Questions Table

-- Enable RLS just in case it wasn't
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- 1. Allow everyone to SELECT (View) questions
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON questions;
CREATE POLICY "Questions are viewable by everyone" 
ON questions FOR SELECT 
USING (true);

-- 2. Allow insertion of questions (for Admin manual/import)
DROP POLICY IF EXISTS "Anyone can insert questions" ON questions;
CREATE POLICY "Anyone can insert questions" 
ON questions FOR INSERT 
WITH CHECK (true);

-- 3. Allow deletion of questions (for Admin manage tab)
DROP POLICY IF EXISTS "Anyone can delete questions" ON questions;
CREATE POLICY "Anyone can delete questions" 
ON questions FOR DELETE 
USING (true);

-- 4. Allow updating of questions
DROP POLICY IF EXISTS "Anyone can update questions" ON questions;
CREATE POLICY "Anyone can update questions" 
ON questions FOR UPDATE 
USING (true);

-- 5. Force schema cache reload just in case
NOTIFY pgrst, reload_schema;
