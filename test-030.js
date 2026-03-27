import fs from 'fs';

let env = '';
try {
  env = fs.readFileSync('.env', 'utf-8');
} catch (e) {
  env = fs.readFileSync('.env.local', 'utf-8');
}

const keyLine = env.split('\n').find(l => l.startsWith('VITE_CHILDCARE_API_KEY='));
const API_KEY = keyLine ? keyLine.split('=')[1].trim() : '';

async function test() {
  const realUrl = `http://api.childcare.go.kr/mediate/rest/cpmsapi030/cpmsapi030/request?key=${API_KEY}&arcode=28260&page=1&perPage=10&page_no=1&num_of_rows=10`;
  console.log('Fetching:', realUrl);
  
  try {
    const res = await fetch(realUrl);
    const text = await res.text();
    const count = (text.match(/<item>/g) || []).length;
    console.log(`Number of items returned: ${count}`);
    console.log('--- RESPONSE HEAD ---');
    console.log(text.substring(0, 500));
  } catch(e) {
    console.error(e);
  }
}
test();
