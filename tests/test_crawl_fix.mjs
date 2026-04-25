import { chromium } from 'playwright';

async function testExtraction() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const url = 'https://central.childcare.go.kr/ccef/job/JobOfferSl.jsp?flag=Sl&JOSEQ=20240321151624';
  console.log(`Navigating to ${url}...`);
  
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1000); 

  const result = await page.evaluate(() => {
    const metadata = {};
    let description = '';

    constRows = Array.from(document.querySelectorAll('tr'));
    
    // Logic from the updated crawler
    const table = document.querySelector('table.table_view') || 
                  document.querySelector('.com_view table') || 
                  document.querySelector('table.board_view') || 
                  document.querySelector('table.tbl_view') || 
                  document.querySelector('.com_table table');
    
    if (table) {
      const tableRows = table.querySelectorAll('tr');
      tableRows.forEach((row) => {
        const thList = row.querySelectorAll('th');
        const tdList = row.querySelectorAll('td');
        
        for(let i=0; i < thList.length; i++) {
          const label = thList[i].innerText.trim();
          const value = tdList[i] ? tdList[i].innerText.trim() : '';
          if (!label) continue;

          if (!metadata['채용제목'] && (label === '제목' || label === '채용제목' || label === '모집제목' || label === '채용 제목')) {
            metadata['채용제목'] = value;
          } else if (!['등록자', '등록일', '조회'].includes(label)) {
            let key = label;
            if (['임금', '급여', '보수'].includes(label)) key = '임금';
            if (['연락처', '전화번호', '휴대전화', '담당자전화번호', '담당자 전화번호'].includes(label)) key = '연락처';
            if (['담당자', '담당자명'].includes(label)) key = '담당자명';
            if (['직종', '모집직종'].includes(label)) key = '모집직종';
            metadata[key] = value;
          }
        }
      });
    }

    const conCon = document.querySelector('.con_con');
    if (conCon) description = conCon.innerText.trim();

    return { metadata, description };
  });

  console.log('Result:', JSON.stringify(result, null, 2));
  await browser.close();
}

testExtraction();
