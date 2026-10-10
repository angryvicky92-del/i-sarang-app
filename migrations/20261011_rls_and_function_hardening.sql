-- Remove duplicate and overly broad policies left by earlier iterations.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='posts' loop
    execute format('drop policy if exists %I on public.posts', p.policyname);
  end loop;
  for p in select policyname from pg_policies where schemaname='public' and tablename='reviews' loop
    execute format('drop policy if exists %I on public.reviews', p.policyname);
  end loop;
  for p in select policyname from pg_policies where schemaname='public' and tablename='profiles' loop
    execute format('drop policy if exists %I on public.profiles', p.policyname);
  end loop;
end $$;

create policy "Posts are publicly readable" on public.posts for select to anon, authenticated using (true);
create policy "Users create own posts" on public.posts for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Users or admins update posts" on public.posts for update to authenticated
using ((select auth.uid()) = user_id or exists (
  select 1 from public.profiles where id=(select auth.uid()) and user_type='관리자'
)) with check ((select auth.uid()) = user_id or exists (
  select 1 from public.profiles where id=(select auth.uid()) and user_type='관리자'
));
create policy "Users or admins delete posts" on public.posts for delete to authenticated
using ((select auth.uid()) = user_id or exists (
  select 1 from public.profiles where id=(select auth.uid()) and user_type='관리자'
));

create policy "Reviews are publicly readable" on public.reviews for select to anon, authenticated using (true);
create policy "Users create own reviews" on public.reviews for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Users or admins update reviews" on public.reviews for update to authenticated
using ((select auth.uid()) = user_id or exists (
  select 1 from public.profiles where id=(select auth.uid()) and user_type='관리자'
)) with check ((select auth.uid()) = user_id or exists (
  select 1 from public.profiles where id=(select auth.uid()) and user_type='관리자'
));
create policy "Users or admins delete reviews" on public.reviews for delete to authenticated
using ((select auth.uid()) = user_id or exists (
  select 1 from public.profiles where id=(select auth.uid()) and user_type='관리자'
));

create policy "Profiles are publicly readable" on public.profiles for select to anon, authenticated using (true);
create policy "Users create own profile" on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);
create policy "Users or admins update profiles" on public.profiles for update to authenticated
using ((select auth.uid()) = id or exists (
  select 1 from public.profiles p where p.id=(select auth.uid()) and p.user_type='관리자'
)) with check ((select auth.uid()) = id or exists (
  select 1 from public.profiles p where p.id=(select auth.uid()) and p.user_type='관리자'
));

alter function public.clear_duplicate_push_tokens() set search_path = public;
alter function public.handle_new_user() set search_path = public;
revoke all on function public.clear_duplicate_push_tokens() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.increment_views(table_name text, row_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if table_name <> 'job_offers' then raise exception 'Invalid table'; end if;
  update public.job_offers set views=coalesce(views,0)+1 where id=row_id;
end $$;
revoke all on function public.increment_views(text,uuid) from public;
grant execute on function public.increment_views(text,uuid) to anon, authenticated;

drop function if exists public.toggle_vote_rpc(text,uuid,uuid,integer);
create or replace function public.toggle_vote_rpc(p_target_type text,p_target_id uuid,p_vote_type integer)
returns json language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid := auth.uid(); v_vote_table text; v_main_table text; v_id_field text;
  v_up_field text; v_down_field text; v_existing_id uuid; v_existing_type integer;
  v_new_user_vote integer:=0; v_diff_up integer:=0; v_diff_down integer:=0; v_row_json json;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_vote_type not in (-1,1) then raise exception 'Invalid vote type'; end if;
  if p_target_type='post' then v_vote_table:='post_votes';v_main_table:='posts';v_id_field:='post_id';v_up_field:='upvotes';v_down_field:='downvotes';
  elsif p_target_type='comment' then v_vote_table:='comment_votes';v_main_table:='post_comments';v_id_field:='comment_id';v_up_field:='upvotes';v_down_field:='downvotes';
  elsif p_target_type='review' then v_vote_table:='review_likes';v_main_table:='reviews';v_id_field:='review_id';v_up_field:='likes';v_down_field:='dislikes';
  else raise exception 'Invalid target type'; end if;
  execute format('select id,vote_type from public.%I where user_id=$1 and %I=$2',v_vote_table,v_id_field)
    into v_existing_id,v_existing_type using v_user_id,p_target_id;
  if v_existing_id is not null then
    if v_existing_type=p_vote_type then
      execute format('delete from public.%I where id=$1',v_vote_table) using v_existing_id;
      if p_vote_type=1 then v_diff_up:=-1; else v_diff_down:=-1; end if;
    else
      execute format('update public.%I set vote_type=$1 where id=$2',v_vote_table) using p_vote_type,v_existing_id;
      if p_vote_type=1 then v_diff_up:=1;v_diff_down:=-1; else v_diff_up:=-1;v_diff_down:=1; end if;
      v_new_user_vote:=p_vote_type;
    end if;
  else
    execute format('insert into public.%I(user_id,%I,vote_type) values($1,$2,$3)',v_vote_table,v_id_field)
      using v_user_id,p_target_id,p_vote_type;
    if p_vote_type=1 then v_diff_up:=1; else v_diff_down:=1; end if;
    v_new_user_vote:=p_vote_type;
  end if;
  execute format('update public.%I set %I=greatest(0,coalesce(%I,0)+$1) where id=$2',v_main_table,v_up_field,v_up_field)
    using v_diff_up,p_target_id;
  execute format('update public.%I set %I=greatest(0,coalesce(%I,0)+$1) where id=$2',v_main_table,v_down_field,v_down_field)
    using v_diff_down,p_target_id;
  execute format('select row_to_json(t) from (select * from public.%I where id=$1)t',v_main_table)
    into v_row_json using p_target_id;
  return json_build_object('data',v_row_json,'userVote',v_new_user_vote);
end $$;
revoke all on function public.toggle_vote_rpc(text,uuid,integer) from public, anon;
grant execute on function public.toggle_vote_rpc(text,uuid,integer) to authenticated;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and user_type='관리자')
$$;
revoke all on function private.is_admin() from public,anon;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "Users or admins update posts" on public.posts;
create policy "Users or admins update posts" on public.posts for update to authenticated
using((select auth.uid())=user_id or (select private.is_admin()))
with check((select auth.uid())=user_id or (select private.is_admin()));
drop policy if exists "Users or admins delete posts" on public.posts;
create policy "Users or admins delete posts" on public.posts for delete to authenticated
using((select auth.uid())=user_id or (select private.is_admin()));
drop policy if exists "Users or admins update reviews" on public.reviews;
create policy "Users or admins update reviews" on public.reviews for update to authenticated
using((select auth.uid())=user_id or (select private.is_admin()))
with check((select auth.uid())=user_id or (select private.is_admin()));
drop policy if exists "Users or admins delete reviews" on public.reviews;
create policy "Users or admins delete reviews" on public.reviews for delete to authenticated
using((select auth.uid())=user_id or (select private.is_admin()));
drop policy if exists "Users or admins update profiles" on public.profiles;
create policy "Users or admins update profiles" on public.profiles for update to authenticated
using((select auth.uid())=id or (select private.is_admin()))
with check((select auth.uid())=id or (select private.is_admin()));
