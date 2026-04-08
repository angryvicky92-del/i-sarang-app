import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles(user_type)')
    .limit(5);
  
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
check();
