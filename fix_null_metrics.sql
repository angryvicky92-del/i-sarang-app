-- Initialize views and upvotes for existing posts to 0 if NULL
UPDATE posts SET views = 0 WHERE views IS NULL;
UPDATE posts SET upvotes = 0 WHERE upvotes IS NULL;

-- Ensure default value is set for future rows
ALTER TABLE posts ALTER COLUMN views SET DEFAULT 0;
ALTER TABLE posts ALTER COLUMN upvotes SET DEFAULT 0;

-- Same for job_offers
UPDATE job_offers SET views = 0 WHERE views IS NULL;
ALTER TABLE job_offers ALTER COLUMN views SET DEFAULT 0;
