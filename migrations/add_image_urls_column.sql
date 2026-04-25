-- Add image_urls column to posts table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='image_urls') THEN
        ALTER TABLE posts ADD COLUMN image_urls text[] DEFAULT '{}';
    END IF;
END $$;
