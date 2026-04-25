
const API_KEY = '11b02d60f0464e4daa2d17c461a094a2';
const API_URL = 'http://api.childcare.go.kr/mediate/rest/cpmsapi030/cpmsapi030/request';

async function testApi() {
  try {
    const params = new URLSearchParams({
      key: API_KEY,
      arcode: '28260', // Incheon Seo-gu
    });
    const url = `${API_URL}?${params.toString()}`;
    console.log('Fetching:', url);
    const response = await fetch(url);
    const text = await response.text();
    
    // Find an item which name contains '아라리버'
    const itemStart = text.indexOf('<item>');
    if (itemStart === -1) {
      console.log('No item found');
      // Print first 500 chars to see what's wrong
      console.log('Response start:', text.substring(0, 500));
      return;
    }

    const items = text.split('<item>');
    const targetItem = items.find(it => it.includes('아라리버')) || items[1];

    if (targetItem) {
      const regex = /<([^>]+)>([^<]*)<\/\1>/g;
      let match;
      const results = {};
      while ((match = regex.exec(targetItem)) !== null) {
        results[match[1]] = match[2];
      }
      console.log('API Tags found for first/target item:');
      console.log(JSON.stringify(results, null, 2));
    }
  } catch (error) {
    console.error('Fetch Error:', error);
  }
}

testApi();
