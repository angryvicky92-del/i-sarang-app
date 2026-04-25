import { XMLParser } from 'fast-xml-parser';

const xml = `<?xml version="1.0" encoding="utf-8"?>
<response>
  <header>
    <resultcode>00</resultcode>
    <resultmsg>NORMAL SERVICE.</resultmsg>
  </header>
  <body>
    <item>
      <sidoname>인천광역시</sidoname>
      <sigunname>서구</sigunname>
      <stcode>28260000720</stcode>
      <crname>예미지어린이집</crname>
    </item>
  </body>
</response>`;

const parser = new XMLParser({ 
    ignoreAttributes: true,
    parseTagValue: false
});

const jsonObj = parser.parse(xml);
console.log(JSON.stringify(jsonObj, null, 2));

let itemsArray = jsonObj.response.body.item;
itemsArray = Array.isArray(itemsArray) ? itemsArray : [itemsArray];

const item = itemsArray[0];

const g = (t) => {
  let val = item[t];
  if (val === undefined) val = item[t.toUpperCase()];
  if (val === undefined) val = item[t.toLowerCase()];
  return val ? String(val).trim() : '';
};

console.log('g("stcode"):', g("stcode"));
