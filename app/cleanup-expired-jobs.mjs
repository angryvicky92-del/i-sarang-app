import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading env from root or app directory
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'app', '.env'),
  path.resolve(__dirname, '.env')
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    console.log(`Loaded environment from: ${envPath}`);
    break;
  }
}

if (!envLoaded) {
  console.warn("Could not find any .env file to load!");
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// Use service role key if available for system processes, otherwise fallback to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in env. Url:", supabaseUrl ? "Present" : "Missing", "Key:", supabaseKey ? "Present" : "Missing");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function cleanupExpiredJobs() {
  console.log('--- Expired Job Offers Cleanup (Batch Mode) ---');
  
  // Calculate KST (UTC+9) today string
  const kstOffset = 9 * 60 * 60 * 1000;
  const todayStr = new Date(Date.now() + kstOffset).toISOString().split('T')[0];
  console.log(`Current KST Date: ${todayStr}`);

  let totalDeleted = 0;
  let keepGoing = true;
  let batchIndex = 1;

  try {
    while (keepGoing) {
      console.log(`\nProcessing Batch #${batchIndex}...`);
      
      // Fetch a small subset of expired IDs to see if there are any left
      const { data: expiredList, error: fetchError } = await supabase
        .from('job_offers')
        .select('id, title, deadline')
        .lt('deadline', todayStr)
        .limit(300);

      if (fetchError) {
        console.error('Error fetching expired jobs:', fetchError);
        return { success: false, error: fetchError };
      }

      if (!expiredList || expiredList.length === 0) {
        console.log(`No more expired jobs found. Loop finished at batch #${batchIndex}.`);
        keepGoing = false;
        break;
      }

      console.log(`Found ${expiredList.length} expired jobs in this batch. Exemplar list:`);
      expiredList.slice(0, 5).forEach(job => {
        console.log(`  - [Deadline: ${job.deadline}] ${job.title} (${job.id})`);
      });

      const idsToDelete = expiredList.map(j => j.id);
      console.log(`Executing batch delete for ${idsToDelete.length} jobs...`);

      const { error: deleteError } = await supabase
        .from('job_offers')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('Error executing delete operation in batch:', deleteError);
        return { success: false, error: deleteError };
      }

      totalDeleted += idsToDelete.length;
      console.log(`Batch #${batchIndex} completed successfully. (Total deleted so far: ${totalDeleted})`);
      
      if (expiredList.length < 300) {
        keepGoing = false;
      } else {
        batchIndex++;
        // Minor cooldown to avoid rate limits
        await new Promise(r => setTimeout(r, 800));
      }
    }

    console.log(`\n======================================================`);
    console.log(`Successfully completed cleanup. Total deleted jobs count: ${totalDeleted}`);
    console.log(`======================================================`);
    return { success: true, count: totalDeleted };
  } catch (e) {
    console.error('Unexpected error in cleanupExpiredJobs batch execution:', e);
    return { success: false, error: e };
  }
}

// Run immediately if this file is executed directly
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('cleanup-expired-jobs.mjs') ||
  process.argv[1].endsWith('cleanup-expired-jobs')
);

if (isDirectRun) {
  cleanupExpiredJobs().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('Direct run execution failed:', err);
    process.exit(1);
  });
}
