import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { count, error } = await supabase
    .from('job_offers')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('Total Job Offers:', count);
}

check();
