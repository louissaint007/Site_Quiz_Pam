-- Add joined_at column to contest_participants if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contest_participants' AND column_name = 'joined_at') THEN
        ALTER TABLE public.contest_participants ADD COLUMN joined_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;
