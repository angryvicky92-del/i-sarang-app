import { XMLParser } from 'fast-xml-parser';

const fetchDaycares = async () => {
  const url = 'http://api.childcare.go.kr/sgnct/dmdata.jsp?key=11b02d60f0464e4daa2d17c461a094a2&arcode=28260';
  const res = await fetch(url);
  const xml = await res.text();
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false
  });
  
  const result = parser.parse(xml);
  const items = result.kinderInfo?.item || [];
  const yemi = items.find(i => i.crname && i.crname.includes('예미지'));
  
  console.log('Daycare from API:', yemi);
}

fetchDaycares();
