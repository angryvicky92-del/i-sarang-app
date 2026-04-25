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

  const targetCount = 3;
  let currentPage = 1;
  let totalSaved = 0;

  while (totalSaved < targetCount && currentPage <= 60) {
    console.log(`--- Processing Page ${currentPage} ---`);
    
    const pageJobs = await page.$$eval('table tbody tr', (trList) => {
      return trList.map(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 8) return null;

        const title = tds[2].innerText.trim();
        
        // Ensure the first TD is a number (sequence ID)
        if (!/^\d+$/.test(tds[0].innerText.trim())) return null;

        const titleLink = tds[2].querySelector('a');
        const onclickText = titleLink ? titleLink.getAttribute('onclick') : '';
        const joseqMatch = onclickText ? onclickText.match(/'(\d+)'/) : null;
        const joseq = joseqMatch ? joseqMatch[1] : '';
        const originalUrl = joseq ? `https://central.childcare.go.kr/ccef/job/JobOfferSl.jsp?flag=Sl&JOSEQ=${joseq}` : '';
        
        return {
          external_id: joseq,
          center_type: tds[1].innerText.trim(),
          title: title,
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

          // 1. Precise Title Extraction from Table (Based on user screenshot)
          const rows = Array.from(document.querySelectorAll('tr'));
          for (const row of rows) {
            const th = row.querySelector('th');
            const td = row.querySelector('td');
            if (th && td && th.innerText.trim() === '제목') {
              metadata['채용제목'] = td.innerText.trim();
              break;
            }
          }

          // 2. Precise Content Extraction (Based on user screenshot: .con_con)
          const conCon = document.querySelector('.con_con');
          if (conCon && conCon.innerText.trim().length > 5) {
            description = conCon.innerText.trim();
          }
          
          if (!description) {
            // Enhanced table selectors fallback
            const table = document.querySelector('.com_view table') || 
                          document.querySelector('table.board_view') || 
                          document.querySelector('table.tbl_view') || 
                          document.querySelector('.com_table table') || 
                          document.querySelectorAll('#contents table')[1] || 
                          document.querySelector('#contents table');
                          
            if (table) {
              const tableRows = table.querySelectorAll('tr');
              tableRows.forEach((row) => {
                const thList = row.querySelectorAll('th');
                const tdList = row.querySelectorAll('td');
                
                if (thList.length > 0) {
                  for(let i=0; i<thList.length; i++) {
                    const label = thList[i].innerText.trim();
                    const value = tdList[i] ? tdList[i].innerText.trim() : '';
                    if (!metadata['채용제목'] && (label === '제목' || label === '채용제목' || label === '모집제목')) {
                      metadata['채용제목'] = value;
                    } else if (label && !['등록자', '등록일', '조회'].includes(label)) {
                      metadata[label] = value;
                    }
                  }
                }
              });
            }
            
            // Enhanced content selectors fallback
            const contentSelectors = [
              '.view_cont', '.con_area', '.board_view_cont', 
              '.con_con', '.view_area', '#contents .txt', 
              '.bbs_view_content', '.view_type01'
            ];
            
            for (const selector of contentSelectors) {
              const el = document.querySelector(selector);
              if (el && el.innerText.trim().length > 5) {
                description = el.innerText.trim();
                break;
              }
            }
          }

          // Table header fallback for title
          if (!metadata['채용제목'] && table) {
            const firstRow = table.querySelector('tr');
            const td = firstRow ? firstRow.querySelector('td') : null;
            if (td && td.innerText.trim().length > 2) {
               metadata['채용제목'] = td.innerText.trim();
            }
          }

          const isErrorPage = !!document.querySelector('img[src*="errorPage.jpg"]');
          return { metadata, content: description, isErrorPage };
        });

        if (result.isErrorPage) {
          console.log(`[!] Error page detected for ${job.joseq}. Skipping...`);
          continue;
        }

        const fullCenterName = result.metadata['어린이집명'] || result.metadata['기관명'] || result.metadata['시설명'];
        if (fullCenterName) job.center_name = fullCenterName;

        const fullTitle = result.metadata['채용제목'] || result.metadata['채용제목_잠정'] || result.metadata['제목'] || result.metadata['모집제목'];
        if (fullTitle && fullTitle !== '어린이집구인' && fullTitle !== '어린이집 구인') {
          job.title = fullTitle;
        }

        // Deduplicate: Check if a job with same center, title and deadline exists
        const { data: existing } = await supabase
          .from('job_offers')
          .select('id, external_id')
          .eq('center_name', job.center_name)
          .eq('title', job.title)
          .eq('deadline', job.deadline)
          .maybeSingle();

        const { 채용제목, 채용제목_잠정, ...restMetadata } = result.metadata;

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
          metadata: restMetadata,
          created_at: new Date().toISOString()
        };

        if (existing) {
          console.log(`[!] Updating existing job ${existing.id} (was ${existing.external_id}, now ${job.joseq})`);
          await supabase.from('job_offers').update(jobData).eq('id', existing.id);
        } else {
          await supabase.from('job_offers').upsert(jobData, { onConflict: 'external_id' });
        }

        totalSaved++;
        console.log(`[${totalSaved}] Saved ${job.title} (${job.center_name})`);
      } catch (e) {
        console.error(`Error scraping ${job.joseq}:`, e.message);
      } finally {
        await detailPage.close();
      }
    }

    if (totalSaved >= targetCount) break;

    try {
      console.log('Searching for the next page link...');
      await page.bringToFront();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      try {
        await page.waitForSelector('.paging, .pagination', { timeout: 10000 });
      } catch (e) {
        console.log('Paging container not found. Re-scrolling...');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);
      }

      const navResult = await page.evaluate(() => {
        const paging = document.querySelector('.paging') || document.querySelector('.pagination');
        if (!paging) return { action: 'stop', error: 'No paging div' };
        
        const active = paging.querySelector('strong');
        if (!active) return { action: 'stop', error: 'No active page (strong) found' };
        
        let sibling = active.nextElementSibling;
        while (sibling) {
          if (sibling.tagName === 'A') {
            const href = sibling.getAttribute('href') || '';
            if (href.startsWith('#page_') && !sibling.classList.contains('next')) {
              return { action: 'click', selector: `.paging a[href="${href}"], .pagination a[href="${href}"]`, type: 'numeric' };
            }
            if (sibling.classList.contains('next') && href === '#page_next') {
              return { action: 'click', selector: 'a.next[href="#page_next"]', type: 'group' };
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
        await page.waitForTimeout(6000); 
        currentPage++; 
      } else {
        console.log(`Finished: ${navResult.error}`);
        break;
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
