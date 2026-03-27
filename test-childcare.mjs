const API_KEY = '11b02d60f0464e4daa2d17c461a094a2';
const API_URL = 'http://api.childcare.go.kr/mediate/rest/cpmsapi030/cpmsapi030/request';

async function testApi() {
  try {
    const params = new URLSearchParams({
      key: API_KEY,
      arcode: '11680',
    });

    const url = `${API_URL}?${params.toString()}`;
    console.log("Fetching:", url);
    const response = await fetch(url);
    const text = await response.text();
    console.log("Response starts with:", text.substring(0, 300));
    
    if (text.includes('<item>')) {
      const matchLa = text.match(/<la>(.*?)<\/la>/g);
      const matchLo = text.match(/<lo>(.*?)<\/lo>/g);
      console.log("Found Lats:", matchLa?.slice(0, 3));
      console.log("Found Lngs:", matchLo?.slice(0, 3));
    }
  } catch (error) {
    console.error(error);
  }
}

testApi();
