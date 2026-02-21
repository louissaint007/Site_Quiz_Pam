-- ==========================================================
-- SQL Fixes for QuizPam User Issues
-- Ensure real_name saving, Questions RLS, and Reviews Table
-- ==========================================================

-- 1. Ensure the profiles table has the real_name column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS real_name TEXT;

-- 2. Update the handle_new_user function to save real_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
BEGIN
  -- Create Profile
  INSERT INTO public.profiles (id, username, email, real_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'User_' || substr(new.id::text, 1, 8)),
    new.email,
    new.raw_user_meta_data->>'real_name'
  );

  -- Create Wallet
  INSERT INTO public.wallets (user_id)
  VALUES (new.id);

  RETURN new;
END;
$$;

-- Ensure the trigger is attached (just in case)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 3. Fix RLS for the questions table to allow manual inserts
-- Ensure RLS is enabled on questions
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert questions (so Admin can add them)
-- (You may restrict this to admins later with `WHERE (SELECT is_admin FROM profiles WHERE id = auth.uid())`)
DROP POLICY IF EXISTS "Authenticated users can insert questions" ON public.questions;
CREATE POLICY "Authenticated users can insert questions" ON public.questions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Ensure everyone can view questions (needed for gameplay)
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
CREATE POLICY "Questions are viewable by everyone" ON public.questions
  FOR SELECT USING (true);


-- 4. Create and set up the reviews (avis) table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read reviews
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own reviews
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews;
CREATE POLICY "Authenticated users can insert reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own reviews
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own reviews
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);
