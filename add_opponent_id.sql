/* 
  Fixes for the winner_messages table to support Rival Notifications
  Run this in the Supabase SQL Editor.
*/

ALTER TABLE public.winner_messages 
ADD COLUMN opponent_id UUID REFERENCES public.profiles(id);

-- Update the RLS policy to allow the opponent to select messages meant for them
DROP POLICY IF EXISTS "Public can view winner messages" ON public.winner_messages;

CREATE POLICY "Public can view winner messages"
    ON public.winner_messages FOR SELECT
    USING (true); -- Keep it public so the ticker works for everyone and the rival notification can read it
