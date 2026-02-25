-- Create game_stories table
CREATE TABLE IF NOT EXISTS public.game_stories (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    target_words TEXT[] NOT NULL DEFAULT '{}',
    difficulty TEXT DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.game_stories ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can read stories (for the game)
CREATE POLICY "Public profiles are viewable by everyone."
    ON public.game_stories FOR SELECT
    USING ( true );

-- Only admins can insert/update/delete stories
CREATE POLICY "Admins can insert game stories"
    ON public.game_stories FOR INSERT
    WITH CHECK ( 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can update game stories"
    ON public.game_stories FOR UPDATE
    USING ( 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can delete game stories"
    ON public.game_stories FOR DELETE
    USING ( 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
    );

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_game_stories BEFORE UPDATE ON public.game_stories 
    FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
