-- 1. Ensure review_likes table has the vote_type column
ALTER TABLE public.review_likes ADD COLUMN IF NOT EXISTS vote_type integer DEFAULT 1;

-- 2. Ensure reviews table has likes/dislikes columns
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS dislikes integer DEFAULT 0;

-- 3. Create/Update the Atomic Voting RPC
CREATE OR REPLACE FUNCTION public.toggle_vote_rpc(
    p_target_type text,
    p_target_id uuid,
    p_user_id uuid,
    p_vote_type integer -- 1 for upvote/like, -1 for downvote
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANT: Bypasses RLS to allow anyone to increment counters
AS $$
DECLARE
    v_vote_table text;
    v_main_table text;
    v_id_field text;
    v_up_field text;
    v_down_field text;
    v_existing_id uuid;
    v_existing_type integer;
    v_new_user_vote integer := 0;
    v_diff_up integer := 0;
    v_diff_down integer := 0;
    v_row_json json;
BEGIN
    -- Setup table names
    IF p_target_type = 'post' THEN
        v_vote_table := 'post_votes';
        v_main_table := 'posts';
        v_id_field := 'post_id';
        v_up_field := 'upvotes';
        v_down_field := 'downvotes';
    ELSIF p_target_type = 'comment' THEN
        v_vote_table := 'comment_votes';
        v_main_table := 'post_comments';
        v_id_field := 'comment_id';
        v_up_field := 'upvotes';
        v_down_field := 'downvotes';
    ELSIF p_target_type = 'review' THEN
        v_vote_table := 'review_likes';
        v_main_table := 'reviews';
        v_id_field := 'review_id';
        v_up_field := 'likes';
        v_down_field := 'dislikes';
    ELSE
        RAISE EXCEPTION 'Invalid target type: %', p_target_type;
    END IF;

    -- Check existing vote
    EXECUTE format('SELECT id, vote_type FROM public.%I WHERE user_id = $1 AND %I = $2', v_vote_table, v_id_field)
    INTO v_existing_id, v_existing_type
    USING p_user_id, p_target_id;

    IF v_existing_id IS NOT NULL THEN
        IF v_existing_type = p_vote_type THEN
            -- Delete (Cancel)
            EXECUTE format('DELETE FROM public.%I WHERE id = $1', v_vote_table)
            USING v_existing_id;
            
            IF p_vote_type = 1 THEN v_diff_up := -1; ELSE v_diff_down := -1; END IF;
            v_new_user_vote := 0;
        ELSE
            -- Update (Toggle)
            EXECUTE format('UPDATE public.%I SET vote_type = $1 WHERE id = $2', v_vote_table)
            USING p_vote_type, v_existing_id;
            
            IF p_vote_type = 1 THEN 
                v_diff_up := 1; v_diff_down := -1; 
            ELSE 
                v_diff_up := -1; v_diff_down := 1; 
            END IF;
            v_new_user_vote := p_vote_type;
        END IF;
    ELSE
        -- Insert (New)
        EXECUTE format('INSERT INTO public.%I (user_id, %I, vote_type) VALUES ($1, $2, $3)', v_vote_table, v_id_field)
        USING p_user_id, p_target_id, p_vote_type;
        
        IF p_vote_type = 1 THEN v_diff_up := 1; ELSE v_diff_down := 1; END IF;
        v_new_user_vote := p_vote_type;
    END IF;

    -- Update main table counts
    IF v_up_field IS NOT NULL THEN
        EXECUTE format('UPDATE public.%I SET %I = GREATEST(0, COALESCE(%I, 0) + $1) WHERE id = $2', v_main_table, v_up_field, v_up_field)
        USING v_diff_up, p_target_id;
    END IF;
    
    IF v_down_field IS NOT NULL THEN
        BEGIN
            EXECUTE format('UPDATE public.%I SET %I = GREATEST(0, COALESCE(%I, 0) + $1) WHERE id = $2', v_main_table, v_down_field, v_down_field)
            USING v_diff_down, p_target_id;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Ignore if dislikes column is missing
        END;
    END IF;

    -- Return updated row + new user vote status
    EXECUTE format('SELECT row_to_json(t) FROM (SELECT * FROM public.%I WHERE id = $1) t', v_main_table)
    INTO v_row_json
    USING p_target_id;

    RETURN json_build_object(
        'data', v_row_json,
        'userVote', v_new_user_vote
    );
END;
$$;
