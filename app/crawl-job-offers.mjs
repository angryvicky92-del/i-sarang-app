import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function crawl() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Referer': 'https://central.childcare.go.kr/'
    }
  });

  const page = await context.newPage();
  
  // Stealth: remove webdriver flag
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  // Handle popups
  page.on('dialog', async d => { 
    console.log(`[Alert] ${d.message()}`); 
    await d.dismiss(); 
  });

  console.log('Navigating to portal list...');
  await page.goto('https://central.childcare.go.kr/ccef/job/JobOfferSlPL.jsp?flag=SlPL', { 
    waitUntil: 'load', 
    timeout: 60000 
  });

  // Initial table check
  try {
    await page.waitForSelector('table', { timeout: 20000 });
  } catch (e) {
    console.log(`[!] Table not found. Title: ${await page.title()}`);
    console.log('Trying Search fallback...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);
  }

  const targetCount = 600;
  let totalSaved = 0;
  let currentPage = 1;
  const detailPage = await context.newPage();

  while (totalSaved < targetCount) {
    console.log(`\n=== Processing Page ${currentPage} (Total Saved: ${totalSaved}) ===`);
    
    // Ensure table is present
    try {
      await page.waitForSelector('table tbody tr', { timeout: 20000 });
    } catch (e) {
      console.log('Main list table missing. Refreshing...');
      await page.goto('https://central.childcare.go.kr/ccef/job/JobOfferSlPL.jsp?flag=SlPL', { waitUntil: 'load' });
      await page.waitForTimeout(5000);
      await page.waitForSelector('table tbody tr', { timeout: 20000 });
    }

    const pageJobs = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(row => {
        const tds = Array.from(row.querySelectorAll('td'));
        if (tds.length < 8) return null;
        
        const titleLink = tds[2].querySelector('a');
        if (!titleLink) return null;
        
        const onclick = titleLink.getAttribute('onclick') || '';
        const match = onclick.match(/goView\('([^']+)'\)/);
        const joseq = match ? match[1] : '';
        const originalUrl = `https://central.childcare.go.kr/ccef/job/JobOfferSlPV.jsp?joseq=${joseq}`;

        return {
          title: titleLink.innerText.trim(),
          center_type: tds[1].innerText.trim(), 
          center_name: tds[3].innerText.trim(), 
          position: tds[4].innerText.trim(),
          location: tds[5].innerText.trim(),
          deadline: tds[6].innerText.trim(),
          posted_at: tds[7].innerText.trim(),
          original_url: originalUrl,
          joseq: joseq
        };
      }).filter(x => x !== null && x.joseq !== '');
    });

    console.log(`Found ${pageJobs.length} jobs. Scraping details...`);

    for (const job of pageJobs) {
      if (totalSaved >= targetCount) break;

      try {
        await detailPage.goto(job.original_url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const result = await detailPage.evaluate(() => {
          const metadata = {};
          let description = '';
          const table = document.querySelector('.view_table') || document.querySelector('.com_table table');
          if (table) {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
              const ths = row.querySelectorAll('th');
              const tds = row.querySelectorAll('td');
              for(let i=0; i<ths.length; i++) {
                const label = ths[i]?.innerText.trim();
                const value = tds[i]?.innerText.trim();
                if (label && label !== '제목') metadata[label] = value;
              }
            });
          }
          description = document.querySelector('.view_content, .view_text, .view_cont, #viewForm')?.innerText?.trim() || '';
          return { metadata, content: description };
        });

        const jobData = {
          external_id: job.joseq,
          center_type: job.center_type,
          title: job.title,
          center_name: job.center_name,
          position: job.position,
          location: job.location,
          deadline: job.deadline,
          posted_at: job.posted_at,
          original_url: job.original_url,
          content: result.content,
          metadata: result.metadata,
          created_at: new Date().toISOString()
        };

        const { data: existing } = await supabase
          .from('job_offers')
          .select('id')
          .eq('center_name', job.center_name)
          .eq('title', job.title)
          .eq('deadline', job.deadline)
          .maybeSingle();

        if (existing) {
          await supabase.from('job_offers').update(jobData).eq('id', existing.id);
          console.log(`[!] Updated ${job.center_name}`);
        } else {
          await supabase.from('job_offers').insert(jobData);
          totalSaved++;
          console.log(`[${totalSaved}] Saved ${job.title} (${job.center_name})`);
        }
      } catch (e) {
        console.error(`Error scraping detail:`, e.message);
      }
      await page.waitForTimeout(500); 
    }

    if (totalSaved >= targetCount) break;

    // Next page logic
    try {
      console.log('Searching for the next page link...');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      try {
        await page.waitForSelector('.paging, .pagination', { timeout: 15000 });
      } catch (e) {
        console.log('Paging container missing. Saving debug screenshot...');
        await page.screenshot({ path: '/tmp/paging_error_final.png' });
        await page.evaluate(() => window.scrollBy(0, -200)); // Try slight scroll up
        await page.waitForTimeout(3000);
      }

      const navResult = await page.evaluate(() => {
        const paging = document.querySelector('.paging') || document.querySelector('.pagination');
        if (!paging) return { action: 'stop', error: 'No paging div' };
        
        const containerClass = paging.classList.contains('paging') ? 'paging' : 'pagination';
        const active = paging.querySelector('strong');
        if (!active) return { action: 'stop', error: 'No active page (strong) found' };
        
        let sibling = active.nextElementSibling;
        while (sibling) {
          if (sibling.tagName === 'A') {
            const href = sibling.getAttribute('href') || '';
            if (href.startsWith('#page_') && !sibling.classList.contains('next')) {
              return { action: 'click', selector: `.${containerClass} a[href="${href}"]`, type: 'numeric' };
            }
            if (sibling.classList.contains('next') && href === '#page_next') {
              return { action: 'click', selector: `.${containerClass} a.next[href="#page_next"]`, type: 'group' };
            }
          }
          sibling = sibling.nextElementSibling;
        }
        return { action: 'stop', error: 'No more numeric or group buttons' };
      });

      if (navResult.action === 'click') {
        console.log(`Navigating: ${navResult.type} click on ${navResult.selector}`);
        const btn = page.locator(navResult.selector).first();
        await btn.scrollIntoViewIfNeeded();
        await btn.click();
        await page.waitForTimeout(8000); 
        currentPage++;
      } else {
        console.log(`Finished: ${navResult.error}`);
        break;
      }
    } catch (e) {
      console.log('Paging navigation error:', e.message);
      break;
    }
  }

  await browser.close();
  console.log('Crawling finished.');
}

crawl().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
