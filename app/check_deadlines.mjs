import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeadlines() {
  console.log('Fetching sample deadlines...');
  const { data, error } = await supabase
    .from('job_offers')
    .select('id, title, deadline, posted_at')
    .order('created_at', { ascending: false })
    .limit(20);
    
  if (error) {
    console.error('Error fetching job offers:', error);
    return;
  }
  
  console.log('--- Recent Job Offers ---');
  data.forEach((job) => {
    console.log(`ID: ${job.id} | Posted: ${job.posted_at} | Deadline: "${job.deadline}" | Title: ${job.title}`);
  });

  // Check if there are expired deadlines
  console.log('\nChecking for expired but active deadlines in DB...');
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: expiredJobs, error: expiredError } = await supabase
    .from('job_offers')
    .select('id, title, deadline')
    .lt('deadline', todayStr)
    .limit(10);

  if (expiredError) {
    console.error('Error fetching expired job offers:', expiredError);
    return;
  }

  console.log('Expired Jobs Count in DB:', expiredJobs?.length || 0);
  if (expiredJobs && expiredJobs.length > 0) {
    expiredJobs.forEach(job => {
      console.log(`Expired - ID: ${job.id} | Deadline: "${job.deadline}" | Title: ${job.title}`);
    });
  }
}

checkDeadlines();
