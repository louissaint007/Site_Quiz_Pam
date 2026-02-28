-- Add the mopyon_mascot_url column to site_settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS mopyon_mascot_url TEXT;
