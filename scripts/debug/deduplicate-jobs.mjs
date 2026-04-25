import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deduplicate() {
  console.log('Fetching all job offers...');
  const { data: jobs, error } = await supabase
    .from('job_offers')
    .select('id, center_name, title, deadline, external_id');

  if (error) {
    console.error('Error fetching jobs:', error);
    return;
  }

  console.log(`Found ${jobs.length} jobs. Identifying duplicates...`);

  const seen = new Map();
  const toDelete = [];

  for (const job of jobs) {
    const key = `${job.center_name}|${job.title}|${job.deadline}`;
    
    if (seen.has(key)) {
      const existing = seen.get(key);
      // Keep the one with the larger external_id (usually the newer one)
      if (parseInt(job.external_id) > parseInt(existing.external_id)) {
        toDelete.push(existing.id);
        seen.set(key, job);
      } else {
        toDelete.push(job.id);
      }
    } else {
      seen.set(key, job);
    }
  }

  console.log(`Identified ${toDelete.length} duplicates to remove.`);

  if (toDelete.length === 0) {
    console.log('No duplicates found.');
    return;
  }

  // Delete in batches of 100
  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100);
    const { error: deleteError } = await supabase
      .from('job_offers')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error('Error deleting batch:', deleteError);
    } else {
      console.log(`Deleted batch of ${batch.length} copies.`);
    }
  }

  console.log('Deduplication finished.');
}

deduplicate();
