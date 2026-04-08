import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupDb() {
  console.log('Cleaning up redundant metadata from database...');
  
  // Note: Supabase JS doesn't support JSONB deletion directly via the builder easily (metadata - 'key')
  // So we use a raw SQL approach if possible, or just fetch and update in batches.
  // Since we have a lot of items, let's use a simple RPC or just multiple updates.
  
  // Actually, I'll just write the SQL to a file and tell the user to run it, 
  // or I can try to run it via an RPC if one exists.
  
  // Let's try to do it in batches of 1000 via JS.
  let totalCleaned = 0;
  while (true) {
    const { data, error } = await supabase
      .from('job_offers')
      .select('id, metadata')
      .or('metadata.cs.{"채용제목":""},metadata.cs.{"채용제목_잠정":""}') // This is a rough check
      .limit(100);
      
    if (error || !data || data.length === 0) break;
    
    for (const item of data) {
      if (item.metadata['채용제목'] || item.metadata['채용제목_잠정']) {
        const newMetadata = { ...item.metadata };
        delete newMetadata['채용제목'];
        delete newMetadata['채용제목_잠정'];
        
        await supabase.from('job_offers').update({ metadata: newMetadata }).eq('id', item.id);
        totalCleaned++;
      }
    }
    console.log(`Cleaned ${totalCleaned} items...`);
  }
  
  console.log(`Cleanup finished. Total items cleaned: ${totalCleaned}`);
}

cleanupDb();
