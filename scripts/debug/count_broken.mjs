import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function countBroken() {
  const { count: titleCount1 } = await supabase.from('job_offers').select('*', { count: 'exact', head: true }).eq('title', '어린이집 구인');
  const { count: titleCount2 } = await supabase.from('job_offers').select('*', { count: 'exact', head: true }).eq('title', '어린이집구인');
  const { count: emptyContentCount } = await supabase.from('job_offers').select('*', { count: 'exact', head: true }).is('content', null);
  const { count: emptyStringCount } = await supabase.from('job_offers').select('*', { count: 'exact', head: true }).eq('content', '');

  console.log(`Jobs with '어린이집 구인': ${titleCount1}`);
  console.log(`Jobs with '어린이집구인': ${titleCount2}`);
  console.log(`Jobs with null content: ${emptyContentCount}`);
  console.log(`Jobs with empty content: ${emptyStringCount}`);
}

countBroken();
