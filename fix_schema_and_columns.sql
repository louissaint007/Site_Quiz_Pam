-- Create new columns if they don't exist in game_sessions
DO $$
BEGIN
    -- score
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_sessions' AND column_name = 'score') THEN
        ALTER TABLE public.game_sessions ADD COLUMN score INTEGER DEFAULT 0;
    END IF;

    -- total_time_ms
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_sessions' AND column_name = 'total_time_ms') THEN
        ALTER TABLE public.game_sessions ADD COLUMN total_time_ms BIGINT DEFAULT 0;
    END IF;

    -- is_completed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_sessions' AND column_name = 'is_completed') THEN
        ALTER TABLE public.game_sessions ADD COLUMN is_completed BOOLEAN DEFAULT false;
    END IF;

    -- started_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_sessions' AND column_name = 'started_at') THEN
        ALTER TABLE public.game_sessions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
    END IF;

    -- contest_id (ensure it exists)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_sessions' AND column_name = 'contest_id') THEN
        ALTER TABLE public.game_sessions ADD COLUMN contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE;
    END IF;

    -- user_id (ensure it exists)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_sessions' AND column_name = 'user_id') THEN
        ALTER TABLE public.game_sessions ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure avatars_url exists in profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatars_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatars_url TEXT;
    END IF;
END $$;

-- Ensure current_participants exists in contests
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contests' AND column_name = 'current_participants') THEN
        ALTER TABLE public.contests ADD COLUMN current_participants INTEGER DEFAULT 0;
    END IF;
END $$;
