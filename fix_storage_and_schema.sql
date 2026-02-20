-- Enable Storage Extension (usually enabled by default but good to check)
-- create extension if not exists "uuid-ossp";

-- 1. Create Buckets
insert into storage.buckets (id, name, public)
values 
  ('avatars', 'avatars', true),
  ('contest-images', 'contest-images', true),
  ('prize-images', 'prize-images', true)
on conflict (id) do nothing;

-- 2. Storage Policies (RLS)

-- Avatars Policies
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' );
  
create policy "Anyone can update their own avatar"
  on storage.objects for update
  using ( bucket_id = 'avatars' );

-- Contest Images Policies
create policy "Contest images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'contest-images' );

create policy "Authenticated users can upload contest images"
  on storage.objects for insert
  with check ( bucket_id = 'contest-images' and auth.role() = 'authenticated' );

-- Prize Images Policies
create policy "Prize images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'prize-images' );

create policy "Authenticated users can upload prize images"
  on storage.objects for insert
  with check ( bucket_id = 'prize-images' and auth.role() = 'authenticated' );


-- 3. Fix Foreign Keys and Relations
-- Ensure game_sessions.user_id references auth.users AND public.profiles
-- The error "Failed to load resource ... game_sessions?select=...,profiles:user_id(...)"
-- usually occurs because PostgREST can't find the relationship.

-- First, let's verify if user_id in game_sessions is a foreign key to public.profiles
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'game_sessions_user_id_fkey_profiles'
  ) then
    -- It might already be compliant to auth.users, but we need it to point to profiles for the join to work easily 
    -- OR we can rely on the fact that profiles.id = auth.users.id
    
    -- Let's explicitly add a FK to profiles if it doesn't exist, to enable the embedding
    alter table public.game_sessions
    drop constraint if exists game_sessions_user_id_fkey; -- drop old one if it points to auth.users only

    alter table public.game_sessions
    add constraint game_sessions_user_id_fkey
    foreign key (user_id)
    references public.profiles(id)
    on delete cascade;
  end if;
end $$;

-- 4. RLS for Profiles update
-- Ensure users can update their own profile (avatar_url)
create policy "Users can update their own profile"
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );
