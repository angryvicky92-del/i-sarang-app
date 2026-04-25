const axios = require('axios');
const TOURISM_API_KEY = '17786a2939036ec9606cb611a87546032109aa3dba9ca7eaefb87793c22b1f51';

async function run() {
  try {
    const res = await axios.get(`https://api.odcloud.kr/api/15091145/v1/uddi:6da3f4cb-eaac-42c5-9500-cfdf76c9496b`, {
      params: {
        serviceKey: decodeURIComponent(TOURISM_API_KEY),
        page: 1,
        perPage: 3000
      }
    });
    const data = res.data.data;
    const gangnam = data.filter(p => (p['기본주소'] || '').includes('강남구'));
    console.log("Total Items:", data.length);
    console.log("Gangnam Items Count:", gangnam.length);
    if (gangnam.length > 0) {
      gangnam.slice(0, 5).forEach(p => console.log("-", p['영업소명'], "|", p['기본주소']));
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}
run();
