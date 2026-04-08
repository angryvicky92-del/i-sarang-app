const API_KEY = '3813cbfbc6154d89a66993a4659eb8f0';
const res = await fetch(`http://api.childcare.go.kr/sgn/app/cns/cnsa/api/api/v1/openapi/cpmsapi029?key=${API_KEY}&arcode=11680`);
const xml = await res.text();
console.log(xml.substring(0, 1500));
