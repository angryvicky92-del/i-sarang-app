import { chromium } from 'playwright';
import fs from 'fs';

async function crawlTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to portal list...');
  await page.goto('https://central.childcare.go.kr/ccef/job/JobOfferSlPL.jsp?flag=SlPL', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  
  try {
     const searchBtn = await page.locator('input[value="검색"], button:has-text("검색"), a:has-text("검색")').first();
     await searchBtn.click();
     await page.waitForTimeout(3000);
  } catch(e) { }

  const firstJob = await page.$$eval('table tbody tr', (trList) => {
    for(let tr of trList) {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 8) {
            const titleLink = tds[2].querySelector('a');
            const onclickText = titleLink ? titleLink.getAttribute('onclick') : '';
            const joseqMatch = onclickText ? onclickText.match(/'(\d+)'/) : null;
            if(joseqMatch) {
               return `https://central.childcare.go.kr/ccef/job/JobOfferSl.jsp?flag=Sl&JOSEQ=${joseqMatch[1]}`;
            }
        }
    }
    return null;
  });

  if (!firstJob) {
    console.log('Could not find a valid job on the first page.');
    await browser.close();
    return;
  }

  const result = await page.evaluate(() => {
    const metadata = {};
    let captionStr = '';
    let description = '';
    
    // Log if com_view exists
    const comViewHtml = document.querySelector('.com_view') ? document.querySelector('.com_view').innerHTML.substring(0, 200) : 'NO_COM_VIEW';
    const detailTable = document.querySelector('.com_view table');

    if (detailTable) {
      const captionTag = detailTable.querySelector('caption');
      if (captionTag) captionStr = captionTag.innerText;

      const rows = detailTable.querySelectorAll('tr');
      rows.forEach((row, rowIndex) => {
        const thList = row.querySelectorAll('th');
        const tdList = row.querySelectorAll('td');
        
        if (thList.length > 0) {
          for(let i=0; i<thList.length; i++) {
            const label = thList[i].innerText.trim();
            const value = tdList[i] ? tdList[i].innerText.trim() : '';
            if (label === '제목' || label === '채용제목' || label === '모집제목') {
              metadata['채용제목'] = value;
            } else if (label && !['등록자', '등록일', '조회'].includes(label)) {
              metadata[label] = value;
            }
          }
        }
      });
    } else {
      // It didn't find .com_view table... dump the first table it finds as fallback
      const fallbackTable = document.querySelector('table');
      if (fallbackTable) {
         const tCap = fallbackTable.querySelector('caption');
         captionStr = tCap ? 'FALLBACK: ' + tCap.innerText : 'FALLBACK NO CAPTION';
      }
    }
    
    // Enhanced content selectors
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
    
    return { htmlSample: comViewHtml, caption: captionStr, metadata, content: description };
  });

  console.log('Result:', JSON.stringify(result, null, 2));

  await browser.close();
}
crawlTest();
