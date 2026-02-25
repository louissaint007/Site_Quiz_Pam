-- Run this in your Supabase SQL Editor to enable the Top Players feature
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS top_players JSONB DEFAULT '[]'::jsonb;
