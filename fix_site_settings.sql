-- Create the site_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  carousel_images JSONB DEFAULT '[]'::jsonb,
  solo_game_image_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a default row if it doesn't exist to ensure exactly one record
INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Policies for site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
ON site_settings FOR SELECT
TO public
USING (true);

-- Assuming only authenticated admin users can modify
CREATE POLICY "Allow admin to update site settings"
ON site_settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
  )
);
