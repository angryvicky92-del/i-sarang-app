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
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to portal list...');
  await page.goto('https://central.childcare.go.kr/ccef/job/JobOfferSlPL.jsp', { waitUntil: 'networkidle' });

  try {
    const searchBtn = await page.locator('input[value="검색"], button:has-text("검색"), a:has-text("검색")').first();
    await searchBtn.click();
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
  } catch (e) {
    console.log('Initial list load failed, trying Enter...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
  }

  let allJobs = [];
  const targetCount = 300;
  let currentPage = 1;

  while (allJobs.length < targetCount && currentPage <= 30) {
    console.log(`--- Crawling Page ${currentPage} (Current total: ${allJobs.length}) ---`);
    
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
          external_id: tds[0].innerText.trim(),
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
      }).filter(x => x !== null);
    });

    allJobs = [...allJobs, ...pageJobs];

    if (allJobs.length >= targetCount) break;

    // Go to next page
    currentPage++;
    try {
      // Find the link that has href="#page_N"
      const pageSelector = `a[href="#page_${currentPage}"]`;
      const nextBtn = await page.locator(pageSelector).first();
      
      if (await nextBtn.isVisible()) {
        console.log(`Clicking page ${currentPage}...`);
        await nextBtn.click();
        await page.waitForTimeout(3000);
      } else {
        // If specific page not found, maybe need to click Next Group arrow
        const nextGroupBtn = await page.locator('a[href="#page_next"]').first();
        if (await nextGroupBtn.isVisible()) {
          console.log('Clicking Next Group arrow...');
          await nextGroupBtn.click();
          await page.waitForTimeout(3000);
          // Now try the specific page again
          const retryPageBtn = await page.locator(pageSelector).first();
          if (await retryPageBtn.isVisible()) {
            await retryPageBtn.click();
            await page.waitForTimeout(3000);
          } else {
            console.log(`Page ${currentPage} still not found after group click.`);
            break;
          }
        } else {
          console.log(`No more pages or next button found at page ${currentPage}.`);
          break;
        }
      }
    } catch (e) {
      console.log('Paging error:', e.message);
      break;
    }
  }

  console.log(`Found total ${allJobs.length} jobs. Starting deep greed-extraction...`);

  for (const job of allJobs) {
    // Check if already exists in DB with content to avoid duplicate deep scraping (optional performance)
    // For now, let's just scrape all to ensure freshness as requested.
    
    console.log(`Scraping deep detail: ${job.title} (${job.center_name})`);
    const detailPage = await context.newPage();
    try {
      await detailPage.goto(job.original_url, { waitUntil: 'load', timeout: 30000 });
      await detailPage.waitForTimeout(1000); 
      
      const result = await detailPage.evaluate(() => {
        const metadata = {};
        let description = '';
        
        const table = document.querySelector('.com_table table') || 
                      document.querySelector('#contents table');
                      
        if (table) {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const thList = row.querySelectorAll('th');
            const tdList = row.querySelectorAll('td');
            
            if (thList.length > 0) {
              for(let i=0; i<thList.length; i++) {
                const label = thList[i].innerText.trim();
                const value = tdList[i] ? tdList[i].innerText.trim() : '';
                if (label && label !== '제목' && label !== '등록자' && label !== '등록일') {
                  metadata[label] = value;
                }
              }
            } else if (tdList.length === 1) {
              const text = tdList[0].innerText.trim();
              if (text.length > 50) {
                description += text + '\n\n';
              }
            }
          });
        }

        const viewCont = document.querySelector('.view_cont');
        if (viewCont) {
          const vcText = viewCont.innerText.trim();
          if (vcText.length > description.length) {
            description = vcText;
          }
        }

        return { metadata, content: description };
      });

      job.metadata = result.metadata;
      job.content = result.content;
      console.log(`- Fields: ${Object.keys(job.metadata).length}, Description len: ${job.content.length}`);

    } catch (e) {
      console.error(`Error scraping ${job.joseq}:`, e.message);
      job.metadata = {};
      job.content = '상세 정보를 불러올 수 없습니다.';
    } finally {
      await detailPage.close();
    }

    const { error } = await supabase
      .from('job_offers')
      .upsert({
        external_id: job.external_id,
        center_type: job.center_type,
        title: job.title,
        center_name: job.center_name,
        position: job.position,
        location: job.location,
        deadline: job.deadline,
        posted_at: job.posted_at,
        original_url: job.original_url,
        content: job.content,
        metadata: job.metadata,
        created_at: new Date().toISOString()
      }, { onConflict: 'external_id' });

    if (error) console.error('Upsert error:', error.message);
    
    // Add a small delay to be polite to the server
    await new Promise(r => setTimeout(r, 500));
  }

  await browser.close();
  console.log('Crawling finished.');
}

crawl();
