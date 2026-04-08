import { chromium } from 'playwright';
import fs from 'fs';

async function captureDetail() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  
  // Use the JOSEQ from the debug run: 2257640
  const joseq = '2257640';
  const url = `https://central.childcare.go.kr/ccef/job/JobOfferSl.jsp?flag=Sl&JOSEQ=${joseq}`;
  console.log(`Navigating to ${url}`);
  
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  const html = await page.content();
  fs.writeFileSync('full_detail.html', html);
  console.log('Saved full_detail.html');
  
  await browser.close();
}

captureDetail();
