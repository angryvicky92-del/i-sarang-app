import fs from 'fs';

let env = '';
try {
  env = fs.readFileSync('.env', 'utf-8');
} catch (e) {
  env = fs.readFileSync('.env.local', 'utf-8');
}

const keyLine = env.split('\n').find(l => l.startsWith('VITE_CHILDCARE_API_KEY='));
const API_KEY = keyLine ? keyLine.split('=')[1].trim() : '';

const stcode = '11680000305'; 
const arcode = '11680';

async function test() {
  const realUrl = `http://api.childcare.go.kr/mediate/rest/cpmsapi031/cpmsapi031/request?key=${API_KEY}&arcode=${arcode}&stcode=${stcode}`;
  console.log('Fetching:', realUrl);
  
  try {
    const res = await fetch(realUrl);
    const text = await res.text();
    console.log('--- RESPONSE START ---');
    console.log(text);
    console.log('--- RESPONSE END ---');
  } catch(e) {
    console.error(e);
  }
}
test();
