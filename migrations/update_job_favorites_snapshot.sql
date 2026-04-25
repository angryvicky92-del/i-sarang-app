-- 1. Add job_snapshot JSONB column
ALTER TABLE public.job_favorites ADD COLUMN IF NOT EXISTS job_snapshot JSONB;

-- 2. Populate the snapshot for existing favorites
UPDATE public.job_favorites f
SET job_snapshot = jsonb_build_object(
    'id', o.id,
    'title', o.title,
    'center_name', o.center_name,
    'location', o.location,
    'deadline', o.deadline,
    'center_type', o.center_type,
    'posted_at', o.posted_at
)
FROM public.job_offers o
WHERE f.job_id = o.id AND f.job_snapshot IS NULL;

-- 3. Drop existing non-nullable foreign key
ALTER TABLE public.job_favorites DROP CONSTRAINT IF EXISTS job_favorites_job_id_fkey;

-- 4. Make job_id nullable so records remain even if job is deleted
ALTER TABLE public.job_favorites ALTER COLUMN job_id DROP NOT NULL;

-- 5. Add new foreign key with ON DELETE SET NULL
ALTER TABLE public.job_favorites 
  ADD CONSTRAINT job_favorites_job_id_fkey 
  FOREIGN KEY (job_id) 
  REFERENCES public.job_offers(id) 
  ON DELETE SET NULL;
