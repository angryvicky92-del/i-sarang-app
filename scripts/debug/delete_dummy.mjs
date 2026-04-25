import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndDel() {
  console.log('Querying dummy job_offers data...');
  const { data, error } = await supabase
    .from('job_offers')
    .select('id, title, center_name')
    .like('center_name', '%연동%');
    
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log(`Found ${data.length} dummy rows under '연동어린이집'. Deleting...`);
    const ids = data.map(d => d.id);
    const { error: delError } = await supabase.from('job_offers').delete().in('id', ids);
    if (delError) {
       console.error('Error deleting:', delError);
    } else {
       console.log('Successfully deleted ' + ids.length + ' dummy jobs.');
    }
  } else {
    console.log('No dummy job rows found with center_name like 연동.');
  }

  // Also let's check title just in case
  const { data: data2 } = await supabase
    .from('job_offers')
    .select('id, title, center_name')
    .like('title', '%연동%');

  if (data2 && data2.length > 0) {
    console.log(`Found ${data2.length} dummy rows under title '연동'. Deleting...`);
    const ids2 = data2.map(d => d.id);
    await supabase.from('job_offers').delete().in('id', ids2);
  }
}
checkAndDel();
