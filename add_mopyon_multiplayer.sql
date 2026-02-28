-- 1. Create the `mopyon_matches` table
CREATE TABLE IF NOT EXISTS public.mopyon_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joiner_id UUID REFERENCES public.profiles(id) DEFAULT NULL,
    status TEXT CHECK (status IN ('waiting', 'in_progress', 'completed', 'abandoned')) DEFAULT 'waiting',
    board_state JSONB DEFAULT '[]'::jsonb,
    current_turn UUID REFERENCES public.profiles(id),
    winner_id UUID REFERENCES public.profiles(id) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE public.mopyon_matches ENABLE ROW LEVEL SECURITY;

-- Allow reading for everyone so users can see matches to join or view history
CREATE POLICY "Matches visible to everyone" 
ON public.mopyon_matches 
FOR SELECT USING (true);

-- Allow insertion only for authenticated users making themselves the creator
CREATE POLICY "Users can create a match" 
ON public.mopyon_matches 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = creator_id);

-- Allow updates (like joining, creating moves, completing matches) if user is part of the match
CREATE POLICY "Players can update their matches" 
ON public.mopyon_matches 
FOR UPDATE TO authenticated 
USING (auth.uid() = creator_id OR auth.uid() = joiner_id OR joiner_id IS NULL);

-- Enable Realtime replication for the table so users get push changes
alter publication supabase_realtime add table public.mopyon_matches;
