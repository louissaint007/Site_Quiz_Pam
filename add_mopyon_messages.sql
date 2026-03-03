-- Create mopyon_messages table
CREATE TABLE public.mopyon_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.mopyon_matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Setup Row Level Security for mopyon_messages
ALTER TABLE public.mopyon_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to read messages for matches they are part of
CREATE POLICY "Users can view messages for their matches" ON public.mopyon_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.mopyon_matches m
            WHERE m.id = mopyon_messages.match_id
            AND (m.creator_id = auth.uid() OR m.joiner_id = auth.uid())
        )
    );

-- Allow winners to insert messages into a completed or abandoned match
CREATE POLICY "Winners can insert messages" ON public.mopyon_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.mopyon_matches m
            WHERE m.id = mopyon_messages.match_id
            AND m.winner_id = auth.uid()
            AND m.status IN ('completed', 'abandoned')
        )
    );

-- Add to supabase realtime
ALTER PUBLICATION supabase_realtime ADD TABLE mopyon_messages;
