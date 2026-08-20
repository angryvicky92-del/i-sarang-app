-- Security hardening for privileged profile fields, shared cache writes, and voting.

-- Users may update their own profile row, but privilege-bearing columns are
-- protected by a trigger because PostgreSQL RLS cannot restrict columns.
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_type NOT IN ('학부모', '선생님', '보육교사') THEN
      NEW.user_type := '학부모';
    END IF;
    NEW.is_verified := NEW.user_type = '학부모';
    NEW.verification_status := CASE WHEN NEW.user_type = '학부모' THEN 'approved' ELSE 'none' END;
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.id AND OLD.user_type <> '관리자' THEN
    IF NEW.user_type NOT IN ('학부모', '선생님', '보육교사') THEN
      NEW.user_type := OLD.user_type;
    END IF;
    NEW.is_verified := OLD.is_verified;
    NEW.verification_status := OLD.verification_status;

    IF NEW.user_type IN ('선생님', '보육교사') AND NEW.user_type <> OLD.user_type THEN
      NEW.is_verified := false;
      NEW.verification_status := 'none';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileges_trigger ON public.profiles;
CREATE TRIGGER protect_profile_privileges_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

DROP POLICY IF EXISTS "Allow public upsert to weather_cache" ON public.weather_cache;
DROP POLICY IF EXISTS "Allow public update to weather_cache" ON public.weather_cache;

DROP FUNCTION IF EXISTS public.toggle_vote_rpc(text, uuid, uuid, integer);

CREATE OR REPLACE FUNCTION public.toggle_vote_rpc(
  p_target_type text,
  p_target_id uuid,
  p_vote_type integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
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
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_vote_type NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Invalid vote type';
  END IF;

  IF p_target_type = 'post' THEN
    v_vote_table := 'post_votes'; v_main_table := 'posts';
    v_id_field := 'post_id'; v_up_field := 'upvotes'; v_down_field := 'downvotes';
  ELSIF p_target_type = 'comment' THEN
    v_vote_table := 'comment_votes'; v_main_table := 'post_comments';
    v_id_field := 'comment_id'; v_up_field := 'upvotes'; v_down_field := 'downvotes';
  ELSIF p_target_type = 'review' THEN
    v_vote_table := 'review_likes'; v_main_table := 'reviews';
    v_id_field := 'review_id'; v_up_field := 'likes'; v_down_field := 'dislikes';
  ELSE
    RAISE EXCEPTION 'Invalid target type';
  END IF;

  EXECUTE format('SELECT id, vote_type FROM public.%I WHERE user_id = $1 AND %I = $2', v_vote_table, v_id_field)
    INTO v_existing_id, v_existing_type USING v_user_id, p_target_id;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_type = p_vote_type THEN
      EXECUTE format('DELETE FROM public.%I WHERE id = $1', v_vote_table) USING v_existing_id;
      IF p_vote_type = 1 THEN v_diff_up := -1; ELSE v_diff_down := -1; END IF;
    ELSE
      EXECUTE format('UPDATE public.%I SET vote_type = $1 WHERE id = $2', v_vote_table)
        USING p_vote_type, v_existing_id;
      IF p_vote_type = 1 THEN v_diff_up := 1; v_diff_down := -1;
      ELSE v_diff_up := -1; v_diff_down := 1; END IF;
      v_new_user_vote := p_vote_type;
    END IF;
  ELSE
    EXECUTE format('INSERT INTO public.%I (user_id, %I, vote_type) VALUES ($1, $2, $3)', v_vote_table, v_id_field)
      USING v_user_id, p_target_id, p_vote_type;
    IF p_vote_type = 1 THEN v_diff_up := 1; ELSE v_diff_down := 1; END IF;
    v_new_user_vote := p_vote_type;
  END IF;

  EXECUTE format('UPDATE public.%I SET %I = GREATEST(0, COALESCE(%I, 0) + $1) WHERE id = $2', v_main_table, v_up_field, v_up_field)
    USING v_diff_up, p_target_id;
  BEGIN
    EXECUTE format('UPDATE public.%I SET %I = GREATEST(0, COALESCE(%I, 0) + $1) WHERE id = $2', v_main_table, v_down_field, v_down_field)
      USING v_diff_down, p_target_id;
  EXCEPTION WHEN undefined_column THEN NULL;
  END;

  EXECUTE format('SELECT row_to_json(t) FROM (SELECT * FROM public.%I WHERE id = $1) t', v_main_table)
    INTO v_row_json USING p_target_id;
  RETURN json_build_object('data', v_row_json, 'userVote', v_new_user_vote);
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_vote_rpc(text, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_vote_rpc(text, uuid, integer) TO authenticated;
