-- Update reviews table to store denormalized daycare info for easier retrieval from Home screen
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS center_name TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS center_addr TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS center_type TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS center_arcode TEXT;

-- Update RLS if needed (already public likely)
COMMENT ON COLUMN public.reviews.center_name IS 'Cached daycare name';
COMMENT ON COLUMN public.reviews.center_arcode IS 'Regional code for API lookup';
