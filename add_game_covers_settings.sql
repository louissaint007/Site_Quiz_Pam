-- Add cover URL columns for the game cards in the lobby
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS mokwaze_cover_url TEXT,
ADD COLUMN IF NOT EXISTS mopyon_cover_url TEXT;
