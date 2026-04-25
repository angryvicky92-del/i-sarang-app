import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function recover() {
  console.log('Fetching broken jobs (titles like 어린이집구인 or empty content)...');
  const { data: brokenJobs, error } = await supabase
    .from('job_offers')
    .select('*')
    .or('title.eq.어린이집구인,title.eq."어린이집 구인",content.eq.""')
    .order('created_at', { ascending: false })
    .limit(600); 

  if (error) {
    console.error('Error fetching broken jobs:', error);
    return;
  }

  console.log(`Found ${brokenJobs.length} potential broken jobs. Starting recovery...`);

  let browser = await chromium.launch({ headless: true });
  let context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  });

  let recoveredCount = 0;

  for (const job of brokenJobs) {
    if (!job.original_url) continue;

    let retrySuccess = false;
    let retryAttempt = 0;

    while (!retrySuccess && retryAttempt < 2) {
      const page = await context.newPage();
      try {
        console.log(`[${recoveredCount + 1}/${brokenJobs.length}] Recovering: ${job.center_name} (ID: ${job.id})`);
        await page.goto(job.original_url, { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(1000);

        const result = await page.evaluate(() => {
          const metadata = {};
          let description = '';
          
          const thElements = Array.from(document.querySelectorAll('th'));
          const titleTh = thElements.find(th => th.textContent.includes('제목'));
          if (titleTh && titleTh.nextElementSibling) {
            metadata['채용제목'] = titleTh.nextElementSibling.textContent.trim();
          }

          const conCon = document.querySelector('.con_con');
          if (conCon) {
            description = conCon.innerText.trim();
          }
          
          const table = document.querySelector('.board_view') || document.querySelector('table');
          if (table) {
            const rows = table.querySelectorAll('tr');
            rows.forEach((row) => {
              const th = row.querySelector('th');
              const td = row.querySelector('td');
              if (th && td) {
                const label = th.innerText.trim();
                const value = td.innerText.trim();
                if (label && !['등록자', '등록일', '조회'].includes(label)) {
                  metadata[label] = value;
                }
              }
            });
          }
          
          const isErrorPage = !!document.querySelector('img[src*="errorPage.jpg"]');
          return { metadata, content: description, isErrorPage };
        });

        if (!result.isErrorPage) {
          const updatedTitle = result.metadata['채용제목'] || job.title;
          const updateData = {
            content: result.content || job.content,
            metadata: { ...job.metadata, ...result.metadata }
          };

          if (updatedTitle && updatedTitle !== '어린이집구인' && updatedTitle !== '어린이집 구인') {
            updateData.title = updatedTitle;
          } else {
            updateData.title = `[채용] ${job.center_name} ${job.position} 모집`;
          }

          await supabase.from('job_offers').update(updateData).eq('id', job.id);
          recoveredCount++;
          console.log(`[OK] Updated: ${updateData.title}`);
        }
        retrySuccess = true;
      } catch (e) {
        console.error(`Attempt ${retryAttempt + 1} failed for ${job.id}:`, e.message);
        retryAttempt++;
        if (e.message.includes('closed') || e.message.includes('Target page')) {
          // Restart browser if crashed
          await browser.close().catch(() => {});
          browser = await chromium.launch({ headless: true });
          context = await browser.newContext();
        }
        await new Promise(r => setTimeout(r, 2000));
      } finally {
        await page.close().catch(() => {});
      }
    }
  }

  await browser.close();
  console.log(`Recovery finished. Successfully updated ${recoveredCount} jobs.`);
}

recover().catch(console.error);
