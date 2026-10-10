update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'certificates';

drop policy if exists "Allow authenticated upload to certificates" on storage.objects;
drop policy if exists "Allow public read from certificates" on storage.objects;
drop policy if exists "Certificate owner upload" on storage.objects;
drop policy if exists "Certificate owner read" on storage.objects;
drop policy if exists "Certificate owner delete" on storage.objects;
drop policy if exists "Certificate admins read" on storage.objects;
drop policy if exists "Certificate admins delete" on storage.objects;

create policy "Certificate owner upload" on storage.objects for insert to authenticated
with check (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Certificate owner read" on storage.objects for select to authenticated
using (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Certificate owner delete" on storage.objects for delete to authenticated
using (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Certificate admins read" on storage.objects for select to authenticated
using (bucket_id = 'certificates' and exists (
  select 1 from public.profiles where id = auth.uid() and user_type = '관리자'
));
create policy "Certificate admins delete" on storage.objects for delete to authenticated
using (bucket_id = 'certificates' and exists (
  select 1 from public.profiles where id = auth.uid() and user_type = '관리자'
));

update public.profiles
set verification_image = regexp_replace(verification_image, '^.*/storage/v1/object/public/certificates/', '')
where verification_image like '%/storage/v1/object/public/certificates/%';

alter table public.daycare_favorites drop constraint if exists daycare_favorites_user_id_fkey;
alter table public.daycare_favorites add constraint daycare_favorites_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.job_favorites drop constraint if exists job_favorites_user_id_fkey;
alter table public.job_favorites add constraint job_favorites_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.posts drop constraint if exists posts_user_id_fkey;
alter table public.posts add constraint posts_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
alter table public.post_comments drop constraint if exists post_comments_author_id_fkey;
alter table public.post_comments add constraint post_comments_author_id_fkey
  foreign key (author_id) references public.profiles(id) on delete set null;

create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('android', 'ios', 'web', 'unknown')),
  updated_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);
alter table public.push_devices enable row level security;
drop policy if exists "Users manage own push devices" on public.push_devices;
create policy "Users manage own push devices" on public.push_devices for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists push_devices_user_id_idx on public.push_devices(user_id);
