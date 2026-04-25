import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function repair() {
  console.log('--- Metadata Repair Process Started ---');
  
  // 1. Fetch jobs with missing metadata
  // We look for jobs where metadata is empty or missing '임금' (a key we know should be there)
  const { data: brokenJobs, error: fetchError } = await supabase
    .from('job_offers')
    .select('id, external_id, original_url, title, center_name')
    .or('metadata.eq.{},metadata->>임금.is.null')
    .order('created_at', { ascending: false })
    .limit(400); // Final large batch to finish remaining repairs

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }

  if (!brokenJobs || brokenJobs.length === 0) {
    console.log('No broken metadata found. All jobs seem to have metadata.');
    return;
  }

  console.log(`Found ${brokenJobs.length} jobs to repair.`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  });

  let successCount = 0;

  for (const job of brokenJobs) {
    console.log(`Scraping ${job.external_id} (${job.center_name})...`);
    const page = await context.newPage();
    try {
      await page.goto(job.original_url, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(500);

      const result = await page.evaluate(() => {
        const metadata = {};
        const table = document.querySelector('table.table_view') || 
                      document.querySelector('.com_view table') || 
                      document.querySelector('table.board_view') || 
                      document.querySelector('table.tbl_view') || 
                      document.querySelector('.com_table table');
        
        if (!table) return null;

        const tableRows = table.querySelectorAll('tr');
        tableRows.forEach((row) => {
          const thList = row.querySelectorAll('th');
          const tdList = row.querySelectorAll('td');
          
          for(let i=0; i < thList.length; i++) {
            const label = thList[i].innerText.trim();
            const value = tdList[i] ? tdList[i].innerText.trim() : '';
            if (!label) continue;

            // Handle metadata mapping (Simplified version of crawler fix)
            let key = label;
            if (['임금', '급여', '보수'].includes(label)) key = '임금';
            if (['연락처', '전화번호', '휴대전화', '담당자전화번호', '담당자 전화번호'].includes(label)) key = '연락처';
            if (['담당자', '담당자명'].includes(label)) key = '담당자명';
            if (['직종', '모집직종'].includes(label)) key = '모집직종';
            if (['소재지', '근무지주소', '근무지 주소'].includes(label)) key = '소재지';
            
            metadata[key] = value;
          }
        });
        return metadata;
      });

      if (result && Object.keys(result).length > 0) {
        // Clean up some keys to match crawler's post-processing if needed
        const { 채용제목, 제목, ...trimmedMetadata } = result;
        
        const { error: updateError } = await supabase
          .from('job_offers')
          .update({ metadata: trimmedMetadata })
          .eq('id', job.id);
        
        if (updateError) throw updateError;
        successCount++;
        console.log(`[OK] Updated metadata for ${job.external_id}`);
      } else {
        console.log(`[!] Failed to extract table for ${job.external_id}`);
      }
    } catch (e) {
      console.error(`Error repairing ${job.external_id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`--- Repair Finished: ${successCount} records updated ---`);
}

repair();
