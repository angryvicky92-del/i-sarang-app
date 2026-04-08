import { XMLParser } from 'fast-xml-parser';

const url = 'http://api.childcare.go.kr/sgnct/dmdata.jsp?key=11b02d60f0464e4daa2d17c461a094a2&arcode=28260';

async function check() {
  const res = await fetch(url);
  const xml = await res.text();
  
  const parser = new XMLParser({ 
      ignoreAttributes: true,
      parseTagValue: false
  });
  
  const jsonObj = parser.parse(xml);
  let itemsArray = [];
  if (jsonObj?.response?.item) {
      itemsArray = Array.isArray(jsonObj.response.item) ? jsonObj.response.item : [jsonObj.response.item];
  } else if (jsonObj?.response?.body?.item) {
      itemsArray = Array.isArray(jsonObj.response.body.item) ? jsonObj.response.body.item : [jsonObj.response.body.item];
  } else if (jsonObj?.response?.body?.items?.item) {
      itemsArray = Array.isArray(jsonObj.response.body.items.item) ? jsonObj.response.body.items.item : [jsonObj.response.body.items.item];
  }

  const yemi = itemsArray.find(item => {
    return (item.crname || item.CRNAME || '').includes('예미지');
  });

  if (yemi) {
      const g = (t) => {
        let val = yemi[t];
        if (val === undefined) val = yemi[t.toUpperCase()];
        if (val === undefined) val = yemi[t.toLowerCase()];
        return val ? String(val).trim() : '';
      };
      
      console.log('Daycare:', yemi.crname);
      console.log('stcode:', g("stcode"));
  } else {
    console.log('yemi not found');
  }
}

check();
