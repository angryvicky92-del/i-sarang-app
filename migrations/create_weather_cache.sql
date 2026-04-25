-- Create weather_cache table for OpenWeatherMap optimization
CREATE TABLE IF NOT EXISTS public.weather_cache (
    location_key TEXT PRIMARY KEY, -- e.g., 'seoul'
    weather_data JSONB NOT NULL,
    pollution_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to weather_cache"
ON public.weather_cache FOR SELECT
USING (true);

-- Allow public insert/update (since this is a shared cache for the app)
-- In a production app, this should be restricted to a service role or specific triggers
CREATE POLICY "Allow public upsert to weather_cache"
ON public.weather_cache FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to weather_cache"
ON public.weather_cache FOR UPDATE
USING (true);
