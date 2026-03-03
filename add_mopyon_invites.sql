-- add_mopyon_invites.sql

CREATE TABLE IF NOT EXISTS public.mopyon_invites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES public.mopyon_matches(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Turn on RLS
ALTER TABLE public.mopyon_invites ENABLE ROW LEVEL SECURITY;

-- Policies for mopyon_invites
CREATE POLICY "Users can view their own invites"
    ON public.mopyon_invites FOR SELECT
    USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

CREATE POLICY "Users can insert invites they send"
    ON public.mopyon_invites FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update invites they receive"
    ON public.mopyon_invites FOR UPDATE
    USING (auth.uid() = receiver_id);

-- Add real-time
ALTER PUBLICATION supabase_realtime ADD TABLE mopyon_invites;

-- Force schema cache reload
NOTIFY pgrst, reload_schema;
