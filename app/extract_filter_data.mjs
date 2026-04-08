import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function extract() {
  const { data: positions } = await supabase.rpc('get_unique_job_positions'); // Might not exist
  // Fallback if RPC doesn't exist:
  const { data: rawJobs } = await supabase.from('job_offers').select('location, position').limit(200);
  
  const uniquePositions = [...new Set(rawJobs.map(j => j.position))].filter(Boolean);
  const uniqueLocations = [...new Set(rawJobs.map(j => j.location.split(' ')[0]))].filter(Boolean);
  
  console.log('Unique Positions:', uniquePositions);
  console.log('Unique Regions:', uniqueLocations);
}

extract();
