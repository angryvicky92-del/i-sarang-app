-- Create disease_advisories table
CREATE TABLE IF NOT EXISTS public.disease_advisories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disease_name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL, -- 'safe', 'caution', 'danger'
    description TEXT, -- e.g., "외출 후 손 씻기 필수!"
    level_val NUMERIC, -- The raw value (e.g., patient ratio)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB -- symptoms, incubation, isolation, etc.
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_disease_advisories_name ON public.disease_advisories(disease_name);

-- Grant permissions (assuming standard public access for now)
ALTER TABLE public.disease_advisories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.disease_advisories FOR SELECT USING (true);
