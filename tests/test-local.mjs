import { chromium } from 'playwright';
import fs from 'fs';
async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://central.childcare.go.kr/ccef/job/JobOfferSlPL.jsp?flag=SlPL', { waitUntil: 'load' });
  const html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('local_dump.html', html);
  await browser.close();
}
run();
