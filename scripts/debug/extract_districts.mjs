import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function extract() {
  const { data: rawJobs } = await supabase.from('job_offers').select('location').limit(1000);
  
  const regionMap = {}; // { '서울특별시': Set(['강남구', '서초구', ...]), ... }
  
  rawJobs.forEach(j => {
    if (!j.location) return;
    const parts = j.location.split(' ');
    if (parts.length < 2) return;
    
    const sido = parts[0];
    const sigungu = parts[1];
    
    if (!regionMap[sido]) regionMap[sido] = new Set();
    regionMap[sido].add(sigungu);
  });
  
  const result = {};
  Object.keys(regionMap).forEach(sido => {
    result[sido] = [...regionMap[sido]].sort();
  });
  
  console.log(JSON.stringify(result, null, 2));
}

extract();
