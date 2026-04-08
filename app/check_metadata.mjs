import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('job_offers')
    .select('title, center_name, position, metadata')
    .limit(10);
    
  if (error) {
    console.error(error);
    return;
  }
  
  data.forEach((job, i) => {
    console.log(`--- Job ${i+1} ---`);
    console.log(`Title: ${job.title}`);
    console.log(`Position: ${job.position}`);
    console.log(`Metadata Keys:`, Object.keys(job.metadata || {}));
    console.log(`Metadata:`, JSON.stringify(job.metadata, null, 2));
  });
}

check();
