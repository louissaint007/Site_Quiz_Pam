-- Remove check constraints if they exist to allow new media types

DO $$
BEGIN
    -- Drop constraint for media_type if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contests_media_type_check') THEN
        ALTER TABLE contests DROP CONSTRAINT contests_media_type_check;
    END IF;

    -- Drop constraint for prize_type if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contests_prize_type_check') THEN
        ALTER TABLE contests DROP CONSTRAINT contests_prize_type_check;
    END IF;

    -- Optionally, you can add them back with new values, but for flexibility we can leave them as TEXT
    -- If you want strict validation, uncomment below:
    -- ALTER TABLE contests ADD CONSTRAINT contests_media_type_check CHECK (media_type IN ('image', 'video', 'gif', '3d'));
    -- ALTER TABLE contests ADD CONSTRAINT contests_prize_type_check CHECK (prize_type IN ('cash', 'object', 'physical', '3d'));
    
END $$;
