const API_KEY = '11b02d60f0464e4daa2d17c461a094a2';
const API_URL = 'http://api.childcare.go.kr/mediate/rest/cpmsapi030/cpmsapi030/request';

async function testApi() {
  try {
    const params = new URLSearchParams({
      key: API_KEY,
      arcode: '11680', // Gangnam
    });
    const url = `${API_URL}?${params.toString()}`;
    const response = await fetch(url);
    const text = await response.text();
    
    // Find the first <item> tag and extract its contents
    const itemStart = text.indexOf('<item>');
    const itemEnd = text.indexOf('</item>');
    if (itemStart !== -1 && itemEnd !== -1) {
      const itemStr = text.substring(itemStart + 6, itemEnd);
      // Split by < and >
      const tags = [];
      const regex = /<([^>]+)>([^<]*)<\/\1>/g;
      let match;
      while ((match = regex.exec(itemStr)) !== null) {
        tags.push(`${match[1]}: ${match[2]}`);
      }
      console.log(tags.join('\n'));
    }
  } catch (error) {
    console.error(error);
  }
}

testApi();
