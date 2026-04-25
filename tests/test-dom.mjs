import { chromium } from 'playwright';
async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://central.childcare.go.kr/ccef/job/JobOfferSlPL.jsp?flag=SlPL', { waitUntil: 'load' });
  const tables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table')).map(t => t.className || 'no-class');
  });
  console.log('Table classes on page:', tables);
  await browser.close();
}
test();
