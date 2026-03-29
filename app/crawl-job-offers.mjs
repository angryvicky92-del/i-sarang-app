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
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'
    }
  });
  const page = await context.newPage();
  
  console.log('Navigating to portal list...');
  let retryCount = 0;
  while (retryCount < 5) {
    try {
      await page.goto('https://central.childcare.go.kr/ccef/job/JobOfferSlPL.jsp?flag=SlPL', { 
        waitUntil: 'load', 
        timeout: 60000 
      });
      break;
    } catch (e) {
      console.log(`Navigation retry ${retryCount + 1}...`);
      retryCount++;
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  try {
    // URL with flag=SlPL usually loads list directly, but we wait for table to be sure
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
  } catch (e) {
    console.log('Table not found, trying Search button click fallback...');
    try {
      const searchBtn = await page.locator('input[value="검색"], button:has-text("검색"), a:has-text("검색")').first();
      await searchBtn.click();
      await page.waitForSelector('table tbody tr', { timeout: 10000 });
    } catch (e2) {
      console.log('Final fallback: Enter key...');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }
  }

  const targetCount = 600;
  let currentPage = 1;
  let totalSaved = 0;

  while (totalSaved < targetCount && currentPage <= 60) {
    console.log(`--- Processing Page ${currentPage} ---`);
    
    const pageJobs = await page.$$eval('table tbody tr', (trList) => {
      return trList.map(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 8) return null;
        
        const titleLink = tds[2].querySelector('a');
        const onclickText = titleLink ? titleLink.getAttribute('onclick') : '';
        const joseqMatch = onclickText ? onclickText.match(/'(\d+)'/) : null;
        const joseq = joseqMatch ? joseqMatch[1] : '';
        const originalUrl = joseq ? `https://central.childcare.go.kr/ccef/job/JobOfferSl.jsp?flag=Sl&JOSEQ=${joseq}` : '';
        
        return {
          external_id: joseq,
          center_type: tds[1].innerText.trim(),
          title: tds[2].innerText.trim(),
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

    console.log(`Found ${pageJobs.length} jobs on page ${currentPage}. Scraping details...`);

    for (const job of pageJobs) {
      if (totalSaved >= targetCount) break;

      const detailPage = await context.newPage();
      try {
        await detailPage.goto(job.original_url, { waitUntil: 'load', timeout: 30000 });
        await detailPage.waitForTimeout(500); 
        
        const result = await detailPage.evaluate(() => {
          const metadata = {};
          let description = '';
          const table = document.querySelector('.com_table table') || document.querySelector('#contents table');
          if (table) {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
              const thList = row.querySelectorAll('th');
              const tdList = row.querySelectorAll('td');
              if (thList.length > 0) {
                for(let i=0; i<thList.length; i++) {
                  const label = thList[i].innerText.trim();
                  const value = tdList[i] ? tdList[i].innerText.trim() : '';
                  if (label && label !== '제목' && label !== '등록자' && label !== '등록일') metadata[label] = value;
                }
              }
            });
          }
          const viewCont = document.querySelector('.view_cont');
          if (viewCont) description = viewCont.innerText.trim();
          return { metadata, content: description };
        });

        await supabase.from('job_offers').upsert({
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
        }, { onConflict: 'external_id' });

        totalSaved++;
        console.log(`[${totalSaved}] Saved ${job.title} (${job.center_name})`);
      } catch (e) {
        console.error(`Error scraping ${job.joseq}:`, e.message);
      } finally {
        await detailPage.close();
      }
    }

    if (totalSaved >= targetCount) break;

    // Go to next page
    currentPage++;
    try {
      console.log(`Searching for page ${currentPage} button...`);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);

      // Check if we are ALREADY on the target page (e.g. after 'Next' group click)
      const activeNum = await page.evaluate(() => {
        const strong = document.querySelector('.paging strong');
        return strong ? strong.innerText.trim() : '';
      });

      if (activeNum === String(currentPage)) {
        console.log(`Already on page ${currentPage} (active). No click needed.`);
        continue;
      }

      const pageSelector = `a[href="#page_${currentPage}"]`;
      const pageBtn = page.locator(pageSelector).first();
      
      if (await pageBtn.count() > 0) {
        console.log(`Clicking page ${currentPage}...`);
        await pageBtn.scrollIntoViewIfNeeded();
        await pageBtn.click();
        await page.waitForTimeout(3000);
      } else {
        console.log(`Page ${currentPage} button not found. Checking for 'Next' button...`);
        const nextGroupBtn = page.locator('a.next[href="#page_next"]').first();
        if (await nextGroupBtn.count() > 0) {
          console.log(`Clicking Next Group button...`);
          await nextGroupBtn.scrollIntoViewIfNeeded();
          await nextGroupBtn.click();
          await page.waitForTimeout(6000); // Wait longer for new page numbers to load
          
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(1000);

          // Re-check if group click landed us on target page
          const newActiveNum = await page.evaluate(() => {
            const paging = document.querySelector('.paging');
            if (!paging) return '';
            const strong = paging.querySelector('strong');
            if (strong && /^\d+$/.test(strong.innerText.trim())) {
              return strong.innerText.trim();
            }
            return '';
          });

          console.log(`Detected active page after 'Next' click: ${newActiveNum}`);

          if (newActiveNum === String(currentPage)) {
            console.log(`Landed on page ${currentPage} after Next button. Perfect. Continuing.`);
            continue;
          }

          const retryPageBtn = page.locator(pageSelector).first();
          if (await retryPageBtn.count() > 0) {
            console.log(`Found page ${currentPage} in next group, clicking...`);
            await retryPageBtn.click();
            await page.waitForTimeout(3000);
          } else {
            console.log(`Page ${currentPage} (active=${newActiveNum}) still not found as link. Stopping.`);
            break;
          }
        } else {
          console.log(`Reached end of results at page ${currentPage - 1}.`);
          break;
        }
      }
    } catch (e) {
      console.log('Paging error:', e.message);
      break;
    }
  }

  await browser.close();
  console.log('Crawling finished.');
}

crawl();
