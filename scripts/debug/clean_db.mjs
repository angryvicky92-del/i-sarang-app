import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function clean() {
  const { error } = await supabase
    .from('job_offers')
    .delete()
    .neq('title', ''); // Delete all where title is not empty (which is all)
    
  if (error) {
    console.error(error);
  } else {
    console.log('Successfully cleared job_offers');
  }
}

clean();
