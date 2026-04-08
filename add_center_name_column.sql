-- Add center_name column to reviews table for better lookup persistence
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS center_name TEXT;

-- Index for better lookup performance
CREATE INDEX IF NOT EXISTS idx_reviews_center_name ON reviews(center_name);
