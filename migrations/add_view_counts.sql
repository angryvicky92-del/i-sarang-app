-- Add views column to posts and job_offers
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE job_offers ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- Function to increment views safely
CREATE OR REPLACE FUNCTION increment_views(table_name TEXT, row_id UUID)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE %I SET views = views + 1 WHERE id = $1', table_name) USING row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
