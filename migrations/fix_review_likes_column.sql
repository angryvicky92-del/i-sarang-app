-- Add missing vote_type column to review_likes
ALTER TABLE public.review_likes ADD COLUMN IF NOT EXISTS vote_type integer DEFAULT 1;

-- Also ensure the likes/dislikes columns exist in reviews table (just in case)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS dislikes integer DEFAULT 0;

-- Optional: Refresh PostgREST cache (can be done manually by clicking 'Refresh' in Supabase UI)
-- NOTIFY pgrst, 'reload schema';
