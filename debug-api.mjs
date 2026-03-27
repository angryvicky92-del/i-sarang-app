import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_CHILDCARE_API_KEY;
const API_URL = 'http://api.childcare.go.kr/mediate/rest/cpmsapi030/cpmsapi030/request';

async function debugAPI() {
  const arcode = '11680'; // 강남구
  console.log(`Checking API for arcode: ${arcode}...`);
  console.log(`API Key prefix: ${API_KEY?.substring(0, 5)}...`);

  const params = new URLSearchParams({
    key: API_KEY,
    arcode: arcode,
  });

  try {
    const response = await fetch(`${API_URL}?${params.toString()}`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const text = await response.text();
    console.log('Raw Response Content (first 500 chars):');
    console.log(text.substring(0, 500));

    if (text.includes('returnState')) {
      const stateMatch = text.match(/<returnState>(.*?)<\/returnState>/);
      console.log('Detected returnState:', stateMatch ? stateMatch[1] : 'Not found');
    }
  } catch (error) {
    console.error('Fetch Error:', error.message);
  }
}

debugAPI();
