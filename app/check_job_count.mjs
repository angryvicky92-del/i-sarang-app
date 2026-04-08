import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env is in the parent directory of 'app'
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCount() {
  // Total count
  const { count, error } = await supabase
    .from('job_offers')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error fetching total count:', error.message);
  } else {
    console.log(`Total Job Offers: ${count}`);
  }
  
  // Today's count (UTC 00:00)
  const today = new Date();
  today.setUTCHours(0,0,0,0);
  
  const { count: todayCount, error: todayError } = await supabase
    .from('job_offers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString());

  if (todayError) {
    console.error('Error fetching today count:', todayError.message);
  } else {
    console.log(`Job Offers added today (UTC): ${todayCount}`);
  }

  // Count from last 24 hours
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count: last24Count, error: last24Error } = await supabase
    .from('job_offers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', last24h.toISOString());

  if (last24Error) {
    console.error('Error fetching last 24h count:', last24Error.message);
  } else {
    console.log(`Job Offers added in last 24h: ${last24Count}`);
  }
}

checkCount();
