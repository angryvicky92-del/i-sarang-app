import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function wipe() {
  console.log('Deleting all rows from job_offers to refresh data...');
  const { error } = await supabase.from('job_offers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error('Error deleting rows:', error);
  } else {
    console.log('Successfully wiped job_offers table.');
  }
}
wipe();
