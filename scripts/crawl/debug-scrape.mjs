import { chromium } from 'playwright';
async function debug() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://central.childcare.go.kr/ccef/job/JobOfferSlPL.jsp?flag=SlPL', { waitUntil: 'load' });
  const jobs = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.list01 tbody tr, .list02 tbody tr, .com_table tbody tr, table tbody tr'));
    return rows.slice(0, 15).map(tr => {
      const tds = Array.from(tr.querySelectorAll('td'));
      return { tdsLength: tds.length, html: tr.innerHTML.trim().substring(0, 50) };
    });
  });
  console.log(jobs);
  await browser.close();
}
debug().catch(console.error);
