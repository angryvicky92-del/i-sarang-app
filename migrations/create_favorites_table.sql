-- Create favorites table
create table if not exists public.daycare_favorites (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    daycare_id text not null,
    daycare_name text,
    metadata jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    unique(user_id, daycare_id)
);

-- Set up RLS
alter table public.daycare_favorites enable row level security;

create policy "Users can view their own favorites"
    on public.daycare_favorites for select
    using ( auth.uid() = user_id );

create policy "Users can insert their own favorites"
    on public.daycare_favorites for insert
    with check ( auth.uid() = user_id );

create policy "Users can delete their own favorites"
    on public.daycare_favorites for delete
    using ( auth.uid() = user_id );
