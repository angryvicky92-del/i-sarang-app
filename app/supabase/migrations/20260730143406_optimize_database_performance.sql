-- Cover foreign-key and filter columns reported by Supabase Performance Advisor.
create index if not exists idx_chat_messages_sender_id on public.chat_messages (sender_id);
create index if not exists idx_chats_user2_id on public.chats (user2_id);
create index if not exists idx_comment_votes_comment_id on public.comment_votes (comment_id);
create index if not exists idx_comments_post_id on public.comments (post_id);
create index if not exists idx_job_favorites_job_id on public.job_favorites (job_id);
create index if not exists idx_post_votes_post_id on public.post_votes (post_id);
create index if not exists idx_review_likes_user_id on public.review_likes (user_id);
