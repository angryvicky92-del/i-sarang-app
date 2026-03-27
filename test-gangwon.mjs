const API_KEY = '11b02d60f0464e4daa2d17c461a094a2';
const API_URL = 'http://api.childcare.go.kr/mediate/rest/cpmsapi030/cpmsapi030/request';

async function testApi(arcode, name) {
  try {
    const params = new URLSearchParams({
      key: API_KEY,
      arcode: arcode,
    });
    const url = `${API_URL}?${params.toString()}`;
    const response = await fetch(url);
    const text = await response.text();
    console.log(`Test ${name} (${arcode}): starts with ${text.substring(0, 150)}`);
  } catch (error) {
    console.error(error);
  }
}

testApi('42110', 'Chuncheon (42)');
testApi('51110', 'Chuncheon (51)');
