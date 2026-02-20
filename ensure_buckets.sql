-- Force creation of missing buckets
-- The 400 error usually means the bucket does not exist.

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('contest-images', 'contest-images', true)
ON CONFLICT (id) DO NOTHING;

-- Ensure Policies Exist (Idempotent usually, but good to retry if they failed)

-- Avatars Policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
CREATE POLICY "Anyone can upload an avatar"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'avatars' );
  
DROP POLICY IF EXISTS "Anyone can update their own avatar" ON storage.objects;
CREATE POLICY "Anyone can update their own avatar"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'avatars' );

-- Contest Images Policies
DROP POLICY IF EXISTS "Contest images are publicly accessible" ON storage.objects;
CREATE POLICY "Contest images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'contest-images' );

DROP POLICY IF EXISTS "Authenticated users can upload contest images" ON storage.objects;
CREATE POLICY "Authenticated users can upload contest images"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'contest-images' AND auth.role() = 'authenticated' );
