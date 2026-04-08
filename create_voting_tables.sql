-- 1. Ensure voting tables exist
CREATE TABLE IF NOT EXISTS public.post_votes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
    vote_type integer CHECK (vote_type IN (1, -1)),
    UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.comment_votes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
    vote_type integer CHECK (vote_type IN (1, -1)),
    UNIQUE(user_id, comment_id)
);

CREATE TABLE IF NOT EXISTS public.review_likes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    review_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE,
    vote_type integer DEFAULT 1,
    UNIQUE(user_id, review_id)
);

-- 2. Add count columns to content tables if they don't exist
DO $$ 
BEGIN 
    -- posts tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='upvotes') THEN
        ALTER TABLE posts ADD COLUMN upvotes integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='downvotes') THEN
        ALTER TABLE posts ADD COLUMN downvotes integer DEFAULT 0;
    END IF;

    -- post_comments table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_comments' AND column_name='upvotes') THEN
        ALTER TABLE post_comments ADD COLUMN upvotes integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_comments' AND column_name='downvotes') THEN
        ALTER TABLE post_comments ADD COLUMN downvotes integer DEFAULT 0;
    END IF;

    -- reviews table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='likes') THEN
        ALTER TABLE reviews ADD COLUMN likes integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='dislikes') THEN
        ALTER TABLE reviews ADD COLUMN dislikes integer DEFAULT 0;
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Drop first to avoid conflicts if re-running)
DROP POLICY IF EXISTS "Anyone can view post votes" ON public.post_votes;
DROP POLICY IF EXISTS "Authenticated users can vote on posts" ON public.post_votes;
DROP POLICY IF EXISTS "Users can update their own post votes" ON public.post_votes;
DROP POLICY IF EXISTS "Users can delete their own post votes" ON public.post_votes;

CREATE POLICY "Anyone can view post votes" ON public.post_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote on posts" ON public.post_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own post votes" ON public.post_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own post votes" ON public.post_votes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view comment votes" ON public.comment_votes;
DROP POLICY IF EXISTS "Authenticated users can vote on comments" ON public.comment_votes;
DROP POLICY IF EXISTS "Users can update their own comment votes" ON public.comment_votes;
DROP POLICY IF EXISTS "Users can delete their own comment votes" ON public.comment_votes;

CREATE POLICY "Anyone can view comment votes" ON public.comment_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote on comments" ON public.comment_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comment votes" ON public.comment_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comment votes" ON public.comment_votes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view review likes" ON public.review_likes;
DROP POLICY IF EXISTS "Authenticated users can like reviews" ON public.review_likes;
DROP POLICY IF EXISTS "Users can delete their own review likes" ON public.review_likes;

CREATE POLICY "Anyone can view review likes" ON public.review_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like reviews" ON public.review_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own review likes" ON public.review_likes FOR DELETE USING (auth.uid() = user_id);
