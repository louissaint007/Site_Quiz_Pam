-- Add social media links to site_settings table
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS x_url TEXT;

-- Update the schema cache just in case
NOTIFY pgrst, 'reload schema';
