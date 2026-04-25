const url = 'https://api.childcare.go.kr/mediate/rest/cpmsapi030/cpmsapi030/request?key=11b02d60f0464e4daa2d17c461a094a2&arcode=28260';

async function check() {
  const res = await fetch(url);
  const xml = await res.text();
  
  const matches = [...xml.matchAll(/<crname>([^<]*예미지[^<]*)<\/crname>.*?<stcode>(\d+)<\/stcode>/gs)];
  for (const m of matches) {
      console.log(m[1], m[2]);
  }
  
  // Also try different regex if order is reversed
  const matches2 = [...xml.matchAll(/<stcode>(\d+)<\/stcode>.*?<crname>([^<]*예미지[^<]*)<\/crname>/gs)];
  for (const m of matches2) {
      console.log(m[2], m[1]);
  }
}
check();
