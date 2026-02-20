-- Forcefully make buckets public (updating existing ones if needed)
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
UPDATE storage.buckets SET public = true WHERE id = 'contest-images';
UPDATE storage.buckets SET public = true WHERE id = 'prize-images';

-- Insert if they don't exist (safety check)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('contest-images', 'contest-images', true),
  ('prize-images', 'prize-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing read policies to avoid duplicates/conflicts
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public Select Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Give public access to avatars" ON storage.objects;

-- Create a catch-all public read policy for avatars
CREATE POLICY "Public Select Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Do the same for contest images
DROP POLICY IF EXISTS "Contest images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public Select Contest Images" ON storage.objects;

CREATE POLICY "Public Select Contest Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'contest-images' );

-- And prize images
DROP POLICY IF EXISTS "Prize images are publicly accessible" ON storage.objects;
CREATE POLICY "Public Select Prize Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'prize-images' );

-- Ensure uploads are allowed (Authenticated users)
DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
CREATE POLICY "Anyone can upload an avatar"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Admin can upload contest images" ON storage.objects;
CREATE POLICY "Admin can upload contest images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'contest-images' AND auth.role() = 'authenticated' );
