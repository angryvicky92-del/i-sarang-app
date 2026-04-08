-- Add center_arcode to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS center_arcode TEXT;

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_center_arcode ON reviews(center_arcode);
