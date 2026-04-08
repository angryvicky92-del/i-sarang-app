import fs from 'fs';
const file = 'app/crawl-job-offers.mjs';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/await page\.waitForSelector\('table', \{ timeout: 20000 \}\);/g, "await page.waitForSelector('.list01', { timeout: 20000 });");
content = content.replace(/await page\.waitForSelector\('table tbody tr', \{ timeout: 20000 \}\);/g, "await page.waitForSelector('.list01 tbody tr', { timeout: 20000 });");
content = content.replace(/document\.querySelectorAll\('table tbody tr'\)/g, "document.querySelectorAll('.list01 tbody tr')");
fs.writeFileSync(file, content);
