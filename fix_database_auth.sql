-- 1. Create a function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Create Profile
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'User_' || substr(new.id::text, 1, 8)),
    new.email
  );

  -- Create Wallet
  insert into public.wallets (user_id)
  values (new.id);

  return new;
end;
$$;

-- 2. Create the trigger (dropped first to handle re-runs)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Enable RLS on Profiles and Wallets if not already enabled
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;

-- 4. Create Policies for Profiles
-- Allow users to view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

-- Allow users to update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Allow public to view basic profile info (username, avatar, etc.)
-- This is needed for leaderboards/contests
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );


-- 5. Create Policies for Wallets
-- Users can view their own wallet
create policy "Users can view own wallet"
  on public.wallets for select
  using ( auth.uid() = user_id );

-- 6. Add email column to profiles if it doesn't exist (robustness)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'email') then
        alter table public.profiles add column email text;
    end if;
end $$;
