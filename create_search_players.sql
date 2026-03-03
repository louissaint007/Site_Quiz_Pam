-- create_search_players.sql
-- Drop the function if it already exists to avoid parameter or return type conflicts
DROP FUNCTION IF EXISTS public.search_players(text, uuid);

CREATE OR REPLACE FUNCTION public.search_players(search_query text, current_user_id uuid)
RETURNS TABLE (
    id uuid,
    username text,
    avatar_url text,
    level integer
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id, username, avatar_url, level
    FROM public.profiles
    WHERE username ILIKE '%' || search_query || '%'
    AND id != current_user_id
    LIMIT 10;
$$;
